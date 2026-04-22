import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { DeepPartial, ILike, In, Repository } from 'typeorm';
import { AppError } from '../../../output-interfaces/Config';
import { AuthorIndex } from '../../../output-interfaces/PublicationIndex';
import { AbstractEntityService } from '../common/abstract-entity.service';
import { AliasLookupService } from '../common/alias-lookup.service';
import { createPersistenceHttpException } from '../common/api-error';
import { hasProvidedEntityId } from '../common/entity-id';
import { mergeEntities } from '../common/merge';
import { AppConfigService } from '../config/app-config.service';
import { InstituteService } from '../institute/institute.service';
import { AuthorPublication } from '../publication/relations/AuthorPublication.entity';
import { AliasAuthorFirstName } from './AliasAuthorFirstName.entity';
import { AliasAuthorLastName } from './AliasAuthorLastName.entity';
import { Author } from './Author.entity';

const AUTHOR_LOCK_SCOPE = 'author';

@Injectable()
export class AuthorService extends AbstractEntityService<Author> {

    constructor(@InjectRepository(Author) repository: Repository<Author>,
        private instService: InstituteService, 
        @InjectRepository(AuthorPublication) private pubAutRepository: Repository<AuthorPublication>,
        @InjectRepository(AliasAuthorFirstName) private aliasFirstNameRepository: Repository<AliasAuthorFirstName>,
        @InjectRepository(AliasAuthorLastName) private aliasLastNameRepository: Repository<AliasAuthorLastName>,
        configService: AppConfigService,
        private aliasLookupService: AliasLookupService) { 
        super(repository, configService);
    }

    protected override getFindManyOptions() {
        return { relations: { institutes: true } };
    }

    protected override getFindOneRelations() {
        return { institutes: true, aliases_first_name: true, aliases_last_name: true };
    }

    public override async save(entity: DeepPartial<Author>, user?: string) {
        const aliasesFirstName = entity.aliases_first_name;
        const aliasesLastName = entity.aliases_last_name;
        const obj = this.stripOwnedCollections(entity, ['aliases_first_name', 'aliases_last_name', 'authorPublications', 'institutes']);
        let authEnt = await super.save(obj, user);
        
        if (authEnt && Object.prototype.hasOwnProperty.call(entity, 'institutes')) {
            authEnt = await super.save({ id: authEnt.id, institutes: entity.institutes }, user);
        }
        if (authEnt && aliasesFirstName !== undefined) {
            authEnt.aliases_first_name = await this.replaceAliasCollection(authEnt, aliasesFirstName, this.aliasFirstNameRepository, 'Author');
        }
        if (authEnt && aliasesLastName !== undefined) {
            authEnt.aliases_last_name = await this.replaceAliasCollection(authEnt, aliasesLastName, this.aliasLastNameRepository, 'Author');
        }
        return authEnt;
    }

    public async identifyAuthor(last_name: string, first_name: string): Promise<Author> {
        const aliasL = await this.aliasLookupService.findAliases(this.aliasLastNameRepository, last_name);
        const aliasF = await this.aliasLookupService.findAliases(this.aliasFirstNameRepository, first_name);

        if (aliasL && aliasL.length > 0 && aliasF && aliasF.length > 0) {
            //both alias in the same entity
            const id = aliasL.find(e => aliasF.find(f => f.elementId === e.elementId)).elementId;
            if (hasProvidedEntityId(id)) return this.repository.findOne({ where: { id }, relations: { institutes: true } })
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
                error = { origin: 'authorService', text: `mehrdeutiger Autor ${last_name}, ${first_name} wurde ${authors.length} mal gefunden in DB mit IDs: ${authors.reduce<string>((v, c, _i, _a) => { return v + ', ' + c.id }, '')}` } as AppError;
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

            if (flag && !dryRun) {
                return {
                    author: await this.repository.save(author).catch((saveError: unknown) => {
                        throw createPersistenceHttpException(saveError);
                    }),
                    error,
                };
            }
            else return { author, error };
        } else if (!dryRun) {
            return {
                author: await this.repository.save({ last_name, first_name, orcid, institutes: [inst] }).catch((saveError: unknown) => {
                    throw createPersistenceHttpException(saveError);
                }),
                error,
            };
        }
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
                .addSelect('SUM(CASE WHEN b.pub_date >= :beginDate and b.pub_date <= :endDate and b."corresponding" THEN 1 ELSE 0 END)', "pub_count_corr")
                .addSelect('SUM(CASE WHEN b.pub_date >= :beginDate and b.pub_date <= :endDate THEN 1 ELSE 0 END)', "pub_count")
                .setParameters({ beginDate, endDate })
        }
        else {
            query = query
                .addSelect("SUM(CASE WHEN b.id IS NOT NULL and b.pub_date is NULL and b.pub_date_print IS NULL and b.pub_date_accepted IS NULL and b.pub_date_submitted IS NULL and b.\"corresponding\" THEN 1 ELSE 0 END)", "pub_count_corr")
                .addSelect("SUM(CASE WHEN b.id IS NOT NULL and b.pub_date is NULL and b.pub_date_print IS NULL and b.pub_date_accepted IS NULL and b.pub_date_submitted IS NULL THEN 1 ELSE 0 END)", "pub_count")
        }

        //console.log(query.getSql());

        return query.getRawMany() as Promise<AuthorIndex[]>;
    }

    public override async delete(auts: Author[]) {
        const authorIds = auts.map(author => author.id).filter((id): id is number => typeof id === 'number');
        await this.pubAutRepository.delete({ authorId: In(authorIds) });
        await this.deleteAliasCollection(this.aliasFirstNameRepository, authorIds);
        await this.deleteAliasCollection(this.aliasLastNameRepository, authorIds);
        return await this.repository.delete(authorIds);
    }

}
