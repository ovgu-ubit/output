import { invoiceAmountsSql } from '../invoice/invoice-costs';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { concatMap, from, Observable, of } from 'rxjs';
import { DataSource, EntityManager, ILike, In, IsNull, LessThan, Repository, TreeRepository } from 'typeorm';
import {  InstituteIndex  } from '@output/interfaces';
import { Author } from '../author/Author.entity';
import { deleteAliasCollection, getProvidedOwnedCollection, LockableEntity, replaceAliasCollection, stripOwnedCollections } from '../common/abstract-entity.service';
import { AliasLookupService } from '../common/alias-lookup.service';
import { createEntityLockedHttpException, createNotFoundHttpException, createPersistenceHttpException } from '../common/api-error';
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
        private aliasLookupService: AliasLookupService,
        private dataSource: DataSource) {
        this.repository = this.manager.getTreeRepository(Institute);
    }

    public async save(inst: Institute[] | LockableEntity[], user?: string) {
        return this.dataSource.transaction(async (manager) => {
            await this.ensureInstitutesCanBeSaved(inst, user, manager);
            const aliasesByIndex = inst.map((institute) => getProvidedOwnedCollection<Institute, AliasInstitute>(institute as Institute, 'aliases'));
            const institutesToSave = inst.map((institute) => stripOwnedCollections<Institute>(institute as Institute, ['aliases', 'authorPublications']));
            const saved = await manager.getTreeRepository(Institute).save(institutesToSave as Institute[]).catch((error: unknown) => {
                throw createPersistenceHttpException(error);
            });
            const savedInstitutes = Array.isArray(saved) ? saved : [saved];
            for (let i = 0; i < savedInstitutes.length; i++) {
                const aliases = aliasesByIndex[i];
                if (aliases !== undefined) {
                    savedInstitutes[i].aliases = await replaceAliasCollection(savedInstitutes[i], aliases, manager.getRepository(AliasInstitute), 'Institute');
                }
            }
            inst.forEach((institute) => this.syncInstituteLockOwner(institute, user));
            return saved;
        });
    }

    public get() {
        return this.repository.find({ relations: { aliases: true, super_institute: true, sub_institutes: true } });
    }
    public async one(id: number, writer: boolean, user?: string) {
        const inst = await this.repository.findOne({ where: { id }, relations: { super_institute: true, sub_institutes: true, aliases: true } });
        if (!inst || !writer) return inst;
        return this.acquireInstituteEditLock(inst, user);
    }

    public async oneOrFail(id: number, writer: boolean, user?: string) {
        const institute = await this.one(id, writer, user);
        if (!institute) throw createNotFoundHttpException('Institute not found.');
        return institute;
    }

    public async delete(insts: Institute[]) {
        return this.dataSource.transaction(async (manager) => {
            const instituteIds = insts.map(institute => institute.id).filter((id): id is number => typeof id === 'number');
            for (const inst of insts) {
                const instE = await manager.getTreeRepository(Institute).findOne({ where: { id: inst.id }, relations: { authorPublications: { institute: true }, authors: { institutes: true } } });
                if (instE.authorPublications) for (const autPub of instE.authorPublications) {
                    await manager.getRepository(AuthorPublication).save({ authorId: autPub.authorId, publicationId: autPub.publicationId, institute: null });
                }
                if (instE.authors) for (const aut of instE.authors) {
                    aut.institutes = aut.institutes.filter(e => e.id !== inst.id);
                    await manager.getRepository(Author).save([aut])
                }
            }
            await deleteAliasCollection(manager.getRepository(AliasInstitute), instituteIds);
            return await manager.getTreeRepository(Institute).delete(instituteIds);
        });
    }

    public findOrSave(affiliation: string, _dry_run = false): Observable<Institute> {
        if (!affiliation) return of(null);
        return from(this.aliasLookupService.findCanonicalElement<AliasInstitute, Institute>(this.aliasRepository, affiliation)).pipe(concatMap(match => {
            const label = match?.label ?? affiliation;
            return from(this.repository.findOne({ where: { label: ILike(label) } }));
        }));
    }

    public async index(reporting_year: number | null, canReadNetCosts = false): Promise<InstituteIndex[]> {
        const parameters: Date[] = [];
        let dateCondition: (publicationAlias: string) => string;

        if (reporting_year) {
            parameters.push(
                new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0)),
                new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999)),
            );
            dateCondition = (publicationAlias) => `${publicationAlias}.pub_date BETWEEN $1 AND $2`;
        } else {
            dateCondition = (publicationAlias) => `${publicationAlias}.pub_date IS NULL
                AND ${publicationAlias}.pub_date_print IS NULL
                AND ${publicationAlias}.pub_date_accepted IS NULL
                AND ${publicationAlias}.pub_date_submitted IS NULL`;
        }

        const costCtes = canReadNetCosts ? `,
            publication_cost AS (
                SELECT invoice_amounts.publication_id,
                    SUM(invoice_amounts.gross_amount) AS net_costs
                FROM (${invoiceAmountsSql()}) invoice_amounts
                GROUP BY invoice_amounts.publication_id
            ),
            corresponding_authorship AS (
                SELECT corresponding_author_publication."publicationId" AS publication_id,
                    COUNT(*) AS authorship_count
                FROM author_publication corresponding_author_publication
                WHERE corresponding_author_publication."corresponding" IS TRUE
                GROUP BY corresponding_author_publication."publicationId"
            )` : '';
        const costJoins = canReadNetCosts ? `
                LEFT JOIN publication_cost
                    ON publication_cost.publication_id = publication.id
                LEFT JOIN corresponding_authorship
                    ON corresponding_authorship.publication_id = publication.id` : '';
        const netCostsSelect = canReadNetCosts
            ? `COALESCE(SUM(CASE
                    WHEN author_publication."corresponding" IS TRUE
                        AND ${dateCondition('publication')}
                    THEN COALESCE(publication_cost.net_costs, 0)
                        / NULLIF(corresponding_authorship.authorship_count, 0)
                    ELSE 0
                END), 0)`
            : 'NULL::double precision';

        const query = `
            WITH direct_authors AS (
                SELECT author_institute."instituteId" AS institute_id,
                    COUNT(DISTINCT author_institute."authorId")::integer AS author_count
                FROM author_institutes_institute author_institute
                GROUP BY author_institute."instituteId"
            ),
            eligible_descendants AS (
                SELECT institute_closure.id_ancestor AS institute_id,
                    institute_closure.id_descendant AS descendant_id
                FROM institute_closure
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM author_publication any_authorship
                    WHERE any_authorship."instituteId" = institute_closure.id_descendant
                ) OR EXISTS (
                    SELECT 1
                    FROM author_publication eligible_authorship
                    LEFT JOIN publication eligible_publication
                        ON eligible_publication.id = eligible_authorship."publicationId"
                    WHERE eligible_authorship."instituteId" = institute_closure.id_descendant
                        AND (eligible_publication.id IS NULL
                            OR (${dateCondition('eligible_publication')}))
                )
            ),
            tree_stats AS (
                SELECT eligible_descendants.institute_id,
                    GREATEST(COUNT(DISTINCT eligible_descendants.descendant_id) - 1, 0)::integer AS sub_inst_count,
                    COUNT(DISTINCT author_institute."authorId")::integer AS author_count_total
                FROM eligible_descendants
                LEFT JOIN author_institutes_institute author_institute
                    ON author_institute."instituteId" = eligible_descendants.descendant_id
                GROUP BY eligible_descendants.institute_id
            )
            ${costCtes},
            publication_stats AS (
                SELECT institute_closure.id_ancestor AS institute_id,
                    COUNT(DISTINCT CASE
                        WHEN ${dateCondition('publication')}
                        THEN publication.id
                    END)::integer AS pub_count,
                    COUNT(DISTINCT CASE
                        WHEN author_publication."corresponding" IS TRUE
                            AND ${dateCondition('publication')}
                        THEN publication.id
                    END)::integer AS pub_count_corr,
                    ${netCostsSelect} AS net_costs
                FROM institute_closure
                LEFT JOIN author_publication
                    ON author_publication."instituteId" = institute_closure.id_descendant
                LEFT JOIN publication
                    ON publication.id = author_publication."publicationId"
                ${costJoins}
                GROUP BY institute_closure.id_ancestor
            )
            SELECT institute.id,
                institute.label,
                institute.short_label,
                institute.opus_id,
                COALESCE(direct_authors.author_count, 0)::integer AS author_count,
                COALESCE(tree_stats.author_count_total, 0)::integer AS author_count_total,
                COALESCE(tree_stats.sub_inst_count, 0)::integer AS sub_inst_count,
                COALESCE(publication_stats.pub_count, 0)::integer AS pub_count,
                COALESCE(publication_stats.pub_count_corr, 0)::integer AS pub_count_corr,
                publication_stats.net_costs
            FROM institute
            LEFT JOIN direct_authors ON direct_authors.institute_id = institute.id
            LEFT JOIN tree_stats ON tree_stats.institute_id = institute.id
            LEFT JOIN publication_stats ON publication_stats.institute_id = institute.id
            ORDER BY institute.id`;

        return this.dataSource.query(query, parameters) as Promise<InstituteIndex[]>;
    }

    public async combine(id1: number, ids: number[], alias_strings?: string[]) {
        return this.dataSource.transaction(async (manager) => {
            return mergeEntities<Institute>({
                repository: this.repository,
                primaryId: id1,
                duplicateIds: ids,
                primaryOptions: { relations: { authors: { institutes: true }, super_institute: true, aliases: true } },
                duplicateOptions: { relations: { authorPublications: { institute: true }, authors: { institutes: true }, super_institute: true, aliases: true } },
                mergeContext: {
                    field: 'institute',
                    autField: 'institutes',
                    pubAutrepository: this.pubAutRepository,
                    autRepository: this.autRepository,
                    alias_strings
                },
                afterSave: async ({ duplicateIds, defaultDelete }) => {
                    await manager.getRepository(AliasInstitute).delete({ elementId: In(duplicateIds) });
                    await defaultDelete();
                },
                manager
            });
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

    private async ensureInstitutesCanBeSaved(institutes: (Institute | LockableEntity)[], user?: string, manager?: EntityManager): Promise<void> {
        const ids = institutes.map((institute) => institute.id).filter((id): id is number => hasProvidedEntityId(id));
        if (ids.length === 0) return;

        const repo = manager ? manager.getTreeRepository(Institute) : this.repository;
        const existing = await repo.find({ where: { id: In(ids) } as never }) ?? [];
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
