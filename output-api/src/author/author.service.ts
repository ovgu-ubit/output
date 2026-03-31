import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { ILike, In, IsNull, LessThan, Repository } from 'typeorm';
import { AppError } from '../../../output-interfaces/Config';
import { AuthorIndex } from '../../../output-interfaces/PublicationIndex';
import { AliasAuthorFirstName } from './AliasAuthorFirstName.entity';
import { AuthorPublication } from '../publication/relations/AuthorPublication.entity';
import { Author } from './Author.entity';
import { AliasAuthorLastName } from './AliasAuthorLastName.entity';
import { InstituteService } from '../institute/institute.service';
import { AppConfigService } from '../config/app-config.service';
import { AliasLookupService } from '../common/alias-lookup.service';
import { EditLockOwnerStore, isExpiredEditLock, normalizeEditLockDate } from '../common/edit-lock';
import { mergeEntities } from '../common/merge';

const AUTHOR_LOCK_SCOPE = 'author';

@Injectable()
export class AuthorService {

    constructor(@InjectRepository(Author) private repository: Repository<Author>,
        private instService: InstituteService, 
        @InjectRepository(AuthorPublication) private pubAutRepository: Repository<AuthorPublication>,
        @InjectRepository(AliasAuthorFirstName) private aliasFirstNameRepository: Repository<AliasAuthorFirstName>,
        @InjectRepository(AliasAuthorLastName) private aliasLastNameRepository: Repository<AliasAuthorLastName>,
        private configService: AppConfigService,
        private aliasLookupService: AliasLookupService) { }

    public async save(aut: any[], user?: string) {
        await this.ensureAuthorsCanBeSaved(aut, user);
        const result = [];
        for (const auth of aut) {
            const obj = { ...auth, institutes: undefined }
            let authEnt = await this.repository.save(obj).catch(err => { console.log(err) });
            if (authEnt && Object.prototype.hasOwnProperty.call(auth, 'institutes')) {
                authEnt = await this.repository.save({ id: authEnt.id, institutes: auth.institutes }).catch(err => { console.log(err) });
            }
            result.push(authEnt);
        }
        aut.forEach((author) => this.syncAuthorLockOwner(author, user));
        return result;
    }

    public get(id?: number) {
        return this.repository.find({ relations: { institutes: true } });
    }

    public async one(id: number, writer: boolean, user?: string) {
        const aut = await this.repository.findOne({ where: { id }, relations: { institutes: true, aliases_first_name: true, aliases_last_name: true } });
        if (!aut || !writer) return aut;
        return this.acquireAuthorEditLock(aut, user);
    }

    public async identifyAuthor(last_name: string, first_name: string): Promise<Author> {
        const aliasL = await this.aliasLookupService.findAliases(this.aliasLastNameRepository, last_name);
        const aliasF = await this.aliasLookupService.findAliases(this.aliasFirstNameRepository, first_name);

        if (aliasL && aliasL.length > 0 && aliasF && aliasF.length > 0) {
            //both alias in the same entity
            const id = aliasL.find(e => aliasF.find(f => f.elementId === e.elementId)).elementId;
            if (id) return this.repository.findOne({ where: { id }, relations: { institutes: true } })
        }
        if (aliasL.length > 0) {
            for (const alias of aliasL) {
                const aut = await this.repository.findOne({ where: { id: alias.elementId }, relations: { institutes: true } })
                if (aut.first_name.toLowerCase().includes(first_name.toLowerCase())) return aut;
            }
        }
        if (aliasF.length > 0) {
            for (const alias of aliasF) {
                const aut = await this.repository.findOne({ where: { id: alias.elementId }, relations: { institutes: true } })
                if (aut.last_name.toLowerCase().includes(last_name.toLowerCase())) return aut;
            }
        }
        return null;
    }

    public async findOrSave(last_name: string, first_name: string, orcid?: string, affiliation?: string, dryRun = false): Promise<{ author: Author, error: AppError }> {
        if (!orcid && (!last_name || !first_name)) throw { origin: 'authorService', text: `weder ORCID, noch Vor- und Nachname sind gegeben` } as AppError;
        let error: AppError = null;
        //1. find an existing entity
        let author: Author;
        //replace points from initials
        // eslint-disable-next-line no-useless-escape
        first_name = first_name.replace('\.', '').trim();
        last_name = last_name.trim();
        //find via orcid
        if (orcid) author = await this.repository.findOne({ where: { orcid }, relations: { institutes: true } });
        if (!author) {
            //find via name
            const authors = await this.repository.find({ where: { last_name: ILike(last_name), first_name: ILike(first_name + '%') }, relations: { institutes: true } });
            if (authors.length > 1) {
                //assign first author and give warning
                author = authors[0];
                error = { origin: 'authorService', text: `mehrdeutiger Autor ${last_name}, ${first_name} wurde ${authors.length} mal gefunden in DB mit IDs: ${authors.reduce<string>((v, c, i, a) => { return v + ', ' + c.id }, '')}` } as AppError;
            } else if (authors.length > 0) author = authors[0];
            else {
                //find via alias
                author = await this.identifyAuthor(last_name, first_name);
            }
        }
        //2. if found, possibly enrich
        //find an affiliation institute
        const inst = affiliation ? await firstValueFrom(this.instService.findOrSave(affiliation, dryRun)) : null;
        if (author) {
            let flag = false;
            if (orcid && !author.orcid) {
                author.orcid = orcid;
                flag = true;
            }
            if (inst && (!author.institutes || author.institutes.length === 0) && !author.institutes.find(e => e.id === inst.id)) {
                if (!author.institutes) author.institutes = [];
                author.institutes.push(inst)
                flag = true;
            }

            if (flag && !dryRun) return { author: await this.repository.save(author), error };
            else return { author, error };
        } else if (!dryRun) return { author: await this.repository.save({ last_name, first_name, orcid, institutes: [inst] }), error };
        else return {author, error}
        //3. if not found, save
    }

    public async combineAuthors(id1: number, ids: number[], aliases_first_name?: string[], aliases_last_name?: string[]) {
            return mergeEntities<Author>({
                repository: this.repository,
                primaryId: id1,
                duplicateIds: ids,
                primaryOptions: {relations: { institutes: true, aliases_first_name: true, aliases_last_name: true }},
                duplicateOptions: { relations: { authorPublications: true, institutes: true, aliases_first_name: true, aliases_last_name: true } },
                mergeContext: {
                    field: 'author',
                    pubAutrepository: this.pubAutRepository,
                    aliases_first_name,
                    aliases_last_name
                },
                    afterSave: async ({ duplicateIds, defaultDelete }) => {
                        if (await this.aliasFirstNameRepository.delete({ elementId: In(duplicateIds) })) {
                             await this.aliasLastNameRepository.delete({ elementId: In(duplicateIds) }) 
                        }
                        await this.pubAutRepository.delete({ authorId: In(duplicateIds) })
    
                        await defaultDelete();
                    },
            });

        
    }

    public async index(reporting_year: number): Promise<AuthorIndex[]> {
        let query = this.repository.manager.createQueryBuilder()
            .from((sq) => sq
                .from("author", "author")
                .leftJoin("author.institutes", "institute")
                .select("author.id", "id")
                .addSelect("author.orcid", "orcid")
                .addSelect("author.gnd_id", "gnd_id")
                .addSelect("author.title", "title")
                .addSelect("author.first_name", "first_name")
                .addSelect("author.last_name", "last_name")
                .addSelect("STRING_AGG(\"institute\".\"label\", '; ')", "institutes")
                .groupBy("author.id")
                .addGroupBy("author.orcid")
                .addGroupBy("author.first_name")
                .addGroupBy("author.last_name")
                .addGroupBy("author.orcid")
                , "a")
            .leftJoin((sq) => sq
                .from(AuthorPublication, "authorPublication")
                .innerJoin("publication", "publication", "publication.id = authorPublication.publicationId")
                .select("publication.id", "id")
                .addSelect("publication.pub_date", "pub_date")
                .addSelect("publication.pub_date_print", "pub_date_print")
                .addSelect("publication.pub_date_accepted", "pub_date_accepted")
                .addSelect("publication.pub_date_submitted", "pub_date_submitted")
                .addSelect("authorPublication.authorId", "authorId")
                .addSelect("authorPublication.corresponding", "corresponding")
                , "b", "b.\"authorId\" = a.id")
            .select("a.id", "id")
            .addSelect("a.orcid", "orcid")
            .addSelect("a.gnd_id", "gnd_id")
            .addSelect("a.title", "title")
            .addSelect("a.first_name", "first_name")
            .addSelect("a.last_name", "last_name")
            .addSelect("COUNT(b)", "pub_count_total")
            .addSelect("a.institutes", "institutes")
            .groupBy("a.id")
            .addGroupBy("a.orcid")
            .addGroupBy("a.title")
            .addGroupBy("a.first_name")
            .addGroupBy("a.last_name")
            .addGroupBy("a.orcid")
            .addGroupBy("a.gnd_id")
            .addGroupBy("a.institutes")

        if (reporting_year) {
            const beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
            const endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
            query = query
                .addSelect("SUM(CASE WHEN b.pub_date >= '" + beginDate.toISOString() + "' and b.pub_date <= '" + endDate.toISOString() + "' and b.\"corresponding\" THEN 1 ELSE 0 END)", "pub_count_corr")
                .addSelect("SUM(CASE WHEN b.pub_date >= '" + beginDate.toISOString() + "' and b.pub_date <= '" + endDate.toISOString() + "' THEN 1 ELSE 0 END)", "pub_count")
        }
        else {
            query = query
                .addSelect("SUM(CASE WHEN b.id IS NOT NULL and b.pub_date is NULL and b.pub_date_print IS NULL and b.pub_date_accepted IS NULL and b.pub_date_submitted IS NULL and b.\"corresponding\" THEN 1 ELSE 0 END)", "pub_count_corr")
                .addSelect("SUM(CASE WHEN b.id IS NOT NULL and b.pub_date is NULL and b.pub_date_print IS NULL and b.pub_date_accepted IS NULL and b.pub_date_submitted IS NULL THEN 1 ELSE 0 END)", "pub_count")
        }

        //console.log(query.getSql());

        return query.getRawMany() as Promise<AuthorIndex[]>;
    }

    public async delete(auts: Author[]) {
        for (const aut of auts) {
            const autE = await this.repository.findOne({ where: { id: aut.id }, relations: { authorPublications: true, institutes: true, aliases_first_name: true, aliases_last_name: true } })
            if (autE.authorPublications) for (const autPub of autE.authorPublications) {
                await this.pubAutRepository.delete({ authorId: autPub.authorId, publicationId: autPub.publicationId });
            }
            if (autE.aliases_first_name) await this.aliasFirstNameRepository.remove(autE.aliases_first_name)
            if (autE.aliases_last_name) await this.aliasLastNameRepository.remove(autE.aliases_last_name)
        }
        return await this.repository.delete(auts.map(p => p.id));
    }

    private async acquireAuthorEditLock(author: Author, user?: string): Promise<Author> {
        const lockTimeoutMs = await this.getLockTimeoutMs();
        const lockedAt = normalizeEditLockDate(author.locked_at);

        if (lockedAt && !isExpiredEditLock(lockedAt, lockTimeoutMs)) {
            if (user && EditLockOwnerStore.getOwner(AUTHOR_LOCK_SCOPE, author.id) === user) {
                return { ...author, locked_at: undefined };
            }
            return author;
        }

        const now = new Date();
        const lockCriteria = !lockedAt
            ? { id: author.id, locked_at: IsNull() }
            : { id: author.id, locked_at: LessThan(new Date(now.getTime() - lockTimeoutMs)) };

        const updateResult = await this.repository.update(lockCriteria as never, { locked_at: now } as never);
        if (!updateResult.affected) {
            return (await this.repository.findOne({ where: { id: author.id }, relations: { institutes: true, aliases_first_name: true, aliases_last_name: true } })) ?? author;
        }

        if (user && author.id) {
            EditLockOwnerStore.setOwner(AUTHOR_LOCK_SCOPE, author.id, user);
        }

        return { ...author, locked_at: undefined };
    }

    private async ensureAuthorsCanBeSaved(authors: Author[], user?: string): Promise<void> {
        const ids = authors.map((author) => author.id).filter((id): id is number => !!id);
        if (ids.length === 0) return;

        const existing = await this.repository.find({ where: { id: In(ids) } }) ?? [];
        const authorMap = new Map(existing.map((author) => [author.id, author]));

        for (const author of authors) {
            if (!author.id) continue;
            await this.ensureScopedEntityEditable(authorMap.get(author.id), author, user);
        }
    }

    private async ensureScopedEntityEditable(
        dbEntity: Pick<Author, 'id' | 'locked_at'> | undefined,
        entity: Pick<Author, 'id' | 'locked_at'>,
        user?: string,
    ): Promise<void> {
        if (!dbEntity?.id) return;

        if (!dbEntity.locked_at) {
            EditLockOwnerStore.release(AUTHOR_LOCK_SCOPE, dbEntity.id);
            return;
        }

        const lockTimeoutMs = await this.getLockTimeoutMs();
        if (isExpiredEditLock(dbEntity.locked_at, lockTimeoutMs)) {
            EditLockOwnerStore.release(AUTHOR_LOCK_SCOPE, dbEntity.id);
            return;
        }

        const owner = EditLockOwnerStore.getOwner(AUTHOR_LOCK_SCOPE, dbEntity.id);
        if (this.isUnlockOnlyRequest(entity)) {
            if (user && owner === user) {
                EditLockOwnerStore.release(AUTHOR_LOCK_SCOPE, dbEntity.id);
                return;
            }
            throw new ConflictException('Entity is currently locked.');
        }

        if (!user || owner !== user) {
            throw new ConflictException('Entity is currently locked.');
        }
    }

    private syncAuthorLockOwner(author: Pick<Author, 'id' | 'locked_at'>, user?: string): void {
        if (!author?.id) return;

        const hasExplicitLockState = Object.prototype.hasOwnProperty.call(author, 'locked_at');
        if (hasExplicitLockState && !author.locked_at) {
            EditLockOwnerStore.release(AUTHOR_LOCK_SCOPE, author.id);
            return;
        }

        if (user) {
            EditLockOwnerStore.setOwner(AUTHOR_LOCK_SCOPE, author.id, user);
        }
    }

    private isUnlockOnlyRequest(author: Pick<Author, 'id' | 'locked_at'>): boolean {
        const keys = Object.keys(author).filter((key) => author[key] !== undefined);
        return !!author?.id
            && author.locked_at === null
            && keys.length > 0
            && keys.every((key) => key === 'id' || key === 'locked_at');
    }

    private async getLockTimeoutMs(): Promise<number> {
        const timeoutInMinutes = Number(await this.configService.get('lock_timeout'));
        const resolvedMinutes = Number.isFinite(timeoutInMinutes) && timeoutInMinutes >= 0 ? timeoutInMinutes : 5;
        return resolvedMinutes * 60 * 1000;
    }
}
