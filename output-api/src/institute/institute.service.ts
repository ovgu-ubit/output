import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { concatMap, from, Observable, of } from 'rxjs';
import { EntityManager, ILike, In, IsNull, LessThan, Repository, TreeRepository } from 'typeorm';
import { InstituteIndex } from '../../../output-interfaces/PublicationIndex';
import { Author } from '../author/Author.entity';
import { deleteAliasCollection, getProvidedOwnedCollection, LockableEntity, replaceAliasCollection, stripOwnedCollections } from '../common/abstract-entity.service';
import { AliasLookupService } from '../common/alias-lookup.service';
import { createEntityLockedHttpException, createPersistenceHttpException } from '../common/api-error';
import { EditLockOwnerStore, isExpiredEditLock, normalizeEditLockDate } from '../common/edit-lock';
import { mergeEntities } from '../common/merge';
import { AppConfigService } from '../config/app-config.service';
import { AuthorPublication } from '../publication/relations/AuthorPublication.entity';
import { AliasInstitute } from './AliasInstitute.entity';
import { Institute } from './Institute.entity';
import { hasProvidedEntityId } from '../common/entity-id';

const INSTITUTE_LOCK_SCOPE = 'institute';

@Injectable()
export class InstituteService {

    repository: TreeRepository<Institute>;

    constructor(@InjectEntityManager() private manager: EntityManager, private configService: AppConfigService,
        @InjectRepository(AuthorPublication) private pubAutRepository: Repository<AuthorPublication>,
        @InjectRepository(Author) private autRepository: Repository<Author>,
        @InjectRepository(AliasInstitute) private aliasRepository: Repository<AliasInstitute>,
        private aliasLookupService: AliasLookupService) {
        this.repository = this.manager.getTreeRepository(Institute);
    }

    public async save(inst: Institute[] | LockableEntity[], user?: string) {
        await this.ensureInstitutesCanBeSaved(inst, user);
        const aliasesByIndex = inst.map((institute) => getProvidedOwnedCollection<Institute, AliasInstitute>(institute as Institute, 'aliases'));
        const institutesToSave = inst.map((institute) => stripOwnedCollections<Institute>(institute as Institute, ['aliases', 'authorPublications']));
        const saved = await this.repository.save(institutesToSave as Institute[]).catch((error: unknown) => {
            throw createPersistenceHttpException(error);
        });
        const savedInstitutes = Array.isArray(saved) ? saved : [saved];
        for (let i = 0; i < savedInstitutes.length; i++) {
            const aliases = aliasesByIndex[i];
            if (aliases !== undefined) {
                savedInstitutes[i].aliases = await replaceAliasCollection(savedInstitutes[i], aliases, this.aliasRepository, 'Institute');
            }
        }
        inst.forEach((institute) => this.syncInstituteLockOwner(institute, user));
        return saved;
    }

    public get() {
        return this.repository.find({ relations: { aliases: true, super_institute: true, sub_institutes: true } });
    }
    public async one(id: number, writer: boolean, user?: string) {
        const inst = await this.repository.findOne({ where: { id }, relations: { super_institute: true, sub_institutes: true, aliases: true } });
        if (!inst || !writer) return inst;
        return this.acquireInstituteEditLock(inst, user);
    }

    public async delete(insts: Institute[]) {
        const instituteIds = insts.map(institute => institute.id).filter((id): id is number => typeof id === 'number');
        for (const inst of insts) {
            const instE = await this.repository.findOne({ where: { id: inst.id }, relations: { authorPublications: { institute: true }, authors: { institutes: true } } });
            if (instE.authorPublications) for (const autPub of instE.authorPublications) {
                await this.pubAutRepository.save({ authorId: autPub.authorId, publicationId: autPub.publicationId, institute: null });
            }
            if (instE.authors) for (const aut of instE.authors) {
                aut.institutes = aut.institutes.filter(e => e.id !== inst.id);
                await this.autRepository.save([aut])
            }
        }
        await deleteAliasCollection(this.aliasRepository, instituteIds);
        return await this.repository.delete(instituteIds);
    }

    public findOrSave(affiliation: string, _dry_run = false): Observable<Institute> {
        if (!affiliation) return of(null);
        return from(this.aliasLookupService.findCanonicalElement<AliasInstitute, Institute>(this.aliasRepository, affiliation)).pipe(concatMap(match => {
            const label = match?.label ?? affiliation;
            return from(this.repository.findOne({ where: { label: ILike(label) } }));
        }));
    }

    public async index(reporting_year: number): Promise<InstituteIndex[]> {
        const result:InstituteIndex[] = [];

        const instIDs = (await this.repository.find({ relations: { authors: true } }))
        for (const inst of instIDs) {
            let query = this.repository.createQueryBuilder("institute")
                .innerJoin("institute_closure", "ic", "ic.id_descendant = institute.id",)
                .leftJoin("author_publication", "aut_pub", "aut_pub.\"instituteId\" = institute.id")
                .leftJoin("publication", "pub", "aut_pub.\"publicationId\" = pub.id")
                .leftJoin("author_institutes_institute", "aut_inst", "aut_inst.\"instituteId\" = institute.id")
                .select("COUNT(distinct pub.id)", "pub_count")
                .addSelect("COUNT(distinct (CASE WHEN \"aut_pub\".\"corresponding\" THEN pub.id ELSE NULL END))", "pub_count_corr")
                .addSelect("COUNT(distinct aut_inst.\"authorId\")", "author_count_total")
                .addSelect("COUNT(distinct id_descendant)-1", "sub_inst_count")
                .where("ic.id_ancestor = :id", { id: inst.id })

            if (reporting_year) {
                const beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
                const endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
                query = query
                    .andWhere('(pub is NULL or pub_date between :beginDate and :endDate)', { beginDate, endDate })
            }
            else {
                query = query
                    .andWhere('(pub is NULL or (pub_date IS NULL and pub_date_print IS NULL and pub_date_accepted IS NULL and pub_date_submitted IS NULL))')
            }
            //console.log(query.getSql());
            const res = await query.getRawOne() as InstituteIndex;
            result.push({ ...res, sub_inst_count: res.sub_inst_count < 0 ? 0 : res.sub_inst_count, id: inst.id, label: inst.label, short_label: inst.short_label, author_count: inst.authors?.length, opus_id: inst.opus_id });
        }

        return result;
    }

    public async combine(id1: number, ids: number[], alias_strings?: string[]) {
        return mergeEntities<Institute>({
            repository: this.repository,
            primaryId: id1,
            duplicateIds: ids,
            primaryOptions: {relations: { authors: { institutes: true }, super_institute: true, aliases: true }},
            duplicateOptions: {relations: { authorPublications: { institute: true }, authors: { institutes: true }, super_institute: true, aliases: true }},
            mergeContext: {
                field: 'institute',
                autField: 'institutes',
                pubAutrepository: this.pubAutRepository,
                autRepository: this.autRepository,
                alias_strings
            },
        });
    }

    async findSuperInstitute(id: number) {
        const insts = await this.repository.find({ relations: { super_institute: true } })
        const inst = await this.repository.findOne({ where: { id }, relations: { super_institute: true } })
        let result = insts.find(e => e.id === inst.super_institute?.id);
        let tmp = result;
        while (tmp) {
            result = tmp;
            tmp = insts.find(e => e.id === tmp.super_institute?.id)
        }
        return result;
    }

    async findInstituteIdsIncludingSubInstitutes(ids: number[]) {
        const result = new Set<number>();

        for (const id of ids) {
            if (typeof id !== 'number') continue;
            result.add(id);
            const subInstitutes = await this.findSubInstitutesFlat(id);
            for (const subInstitute of subInstitutes) {
                if (typeof subInstitute?.id === 'number') result.add(subInstitute.id);
            }
        }

        return [...result];
    }

    async findSubInstitutesFlat(id: number) {
        const insts = await this.repository.find({ relations: { sub_institutes: true } })
        const inst = await this.repository.findOne({ where: { id }, relations: { sub_institutes: true } })
        if (!inst?.sub_institutes?.length) return [];
        let result = inst.sub_institutes;
        let flag = true;
        while (flag) {
            flag = false;
            let newSubs = [];
            for (const sub of result) {
                const subI = insts.find(e => e.id === sub.id)
                if (subI.sub_institutes && subI.sub_institutes.length > 0) {
                    newSubs = newSubs.concat(subI.sub_institutes);
                    subI.sub_institutes = [];
                    flag = true;
                }
            }
            result = result.concat(newSubs);
        }
        return result;
    }

    private async acquireInstituteEditLock(institute: Institute, user?: string): Promise<Institute> {
        const lockTimeoutMs = await this.getLockTimeoutMs();
        const lockedAt = normalizeEditLockDate(institute.locked_at);

        if (lockedAt && !isExpiredEditLock(lockedAt, lockTimeoutMs)) {
            if (user && EditLockOwnerStore.getOwner(INSTITUTE_LOCK_SCOPE, institute.id) === user) {
                return { ...institute, locked_at: undefined };
            }
            return institute;
        }

        const now = new Date();
        const lockCriteria = !lockedAt
            ? { id: institute.id, locked_at: IsNull() }
            : { id: institute.id, locked_at: LessThan(new Date(now.getTime() - lockTimeoutMs)) };

        const updateResult = await this.repository.update(lockCriteria as never, { locked_at: now } as never);
        if (!updateResult.affected) {
            return (await this.repository.findOne({ where: { id: institute.id }, relations: { super_institute: true, sub_institutes: true, aliases: true } })) ?? institute;
        }

        if (user && hasProvidedEntityId(institute.id)) {
            EditLockOwnerStore.setOwner(INSTITUTE_LOCK_SCOPE, institute.id, user);
        }

        return { ...institute, locked_at: undefined };
    }

    private async ensureInstitutesCanBeSaved(institutes: (Institute | LockableEntity)[], user?: string): Promise<void> {
        const ids = institutes.map((institute) => institute.id).filter((id): id is number => hasProvidedEntityId(id));
        if (ids.length === 0) return;

        const existing = await this.repository.find({ where: { id: In(ids) } as never }) ?? [];
        const instituteMap = new Map(existing.map((institute) => [institute.id, institute]));

        for (const institute of institutes) {
            if (!hasProvidedEntityId(institute.id)) continue;
            await this.ensureScopedEntityEditable(instituteMap.get(institute.id), institute, user);
        }
    }

    private async ensureScopedEntityEditable(
        dbEntity: Pick<Institute, 'id' | 'locked_at'> | undefined,
        entity: Pick<Institute, 'id' | 'locked_at'>,
        user?: string,
    ): Promise<void> {
        if (!hasProvidedEntityId(dbEntity?.id)) return;

        if (!dbEntity.locked_at) {
            EditLockOwnerStore.release(INSTITUTE_LOCK_SCOPE, dbEntity.id);
            return;
        }

        const lockTimeoutMs = await this.getLockTimeoutMs();
        if (isExpiredEditLock(dbEntity.locked_at, lockTimeoutMs)) {
            EditLockOwnerStore.release(INSTITUTE_LOCK_SCOPE, dbEntity.id);
            return;
        }

        const owner = EditLockOwnerStore.getOwner(INSTITUTE_LOCK_SCOPE, dbEntity.id);
        if (this.isUnlockOnlyRequest(entity)) {
            if (user && owner === user) {
                EditLockOwnerStore.release(INSTITUTE_LOCK_SCOPE, dbEntity.id);
                return;
            }
            throw createEntityLockedHttpException();
        }

        if (!user || owner !== user) {
            throw createEntityLockedHttpException();
        }
    }

    private syncInstituteLockOwner(institute: Pick<LockableEntity, 'id' | 'locked_at'>, user?: string): void {
        if (!hasProvidedEntityId(institute?.id)) return;

        const hasExplicitLockState = Object.prototype.hasOwnProperty.call(institute, 'locked_at');
        if (hasExplicitLockState && !institute.locked_at) {
            EditLockOwnerStore.release(INSTITUTE_LOCK_SCOPE, institute.id);
            return;
        }

        if (user) {
            EditLockOwnerStore.setOwner(INSTITUTE_LOCK_SCOPE, institute.id, user);
        }
    }

    private isUnlockOnlyRequest(institute: Pick<LockableEntity, 'id' | 'locked_at'>): boolean {
        const keys = Object.keys(institute).filter((key) => institute[key] !== undefined);
        return hasProvidedEntityId(institute?.id)
            && institute.locked_at === null
            && keys.length > 0
            && keys.every((key) => key === 'id' || key === 'locked_at');
    }

    private async getLockTimeoutMs(): Promise<number> {
        const timeoutInMinutes = Number(await this.configService.get('lock_timeout'));
        const resolvedMinutes = Number.isFinite(timeoutInMinutes) && timeoutInMinutes >= 0 ? timeoutInMinutes : 5;
        return resolvedMinutes * 60 * 1000;
    }
}
