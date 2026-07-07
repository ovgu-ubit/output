import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, FindManyOptions, FindOptionsRelations, In, IsNull, LessThan, Not, Repository } from 'typeorm';
import { WorkflowReport as IWorkflowReport } from '@output/interfaces';
import { createEntityLockedHttpException, createInvalidRequestHttpException, createNotFoundHttpException, createPersistenceHttpException } from '../../common/api-error';
import { EditLockableEntity, EditLockOwnerStore, isExpiredEditLock, normalizeEditLockDate } from '../../common/edit-lock';
import { hasProvidedEntityId } from '../../common/entity-id';
import { mergeEntities } from '../../common/merge';
import { AppConfigService } from '../../config/app-config.service';
import { Invoice } from '../../invoice/Invoice.entity';
import { AuthorPublication } from '../relations/AuthorPublication.entity';
import { PublicationRelationService } from '../relations/publication-relation.service';
import { Publication } from './Publication.entity';
import { PublicationDuplicate } from './PublicationDuplicate.entity';
import { PublicationChangeService } from './publication-change.service';

interface SavePublicationOptions {
    workflowReport?: IWorkflowReport;
    by_user?: string;
    dry_change?: boolean;
    manager?: EntityManager;
}

interface CombinePublicationOptions {
    ignoreLocks?: boolean;
}

const PUBLICATION_LOCK_SCOPE = 'publication';

@Injectable()
export class PublicationService {
    constructor(@InjectRepository(Publication) private pubRepository: Repository<Publication>,
        private configService: AppConfigService,
        private publicationChangeService: PublicationChangeService,
        private dataSource: DataSource,
        private publicationRelationService: PublicationRelationService) { }

    public async getPublicationOrFail(id: number, reader: boolean, writer: boolean, user?: string) {
        if (!hasProvidedEntityId(id)) throw createInvalidRequestHttpException('id must be given');
        const publication = await this.getPublication(id, reader, writer, user);
        if (!publication) throw createNotFoundHttpException('Publication not found.');
        return publication;
    }

    public async getPublicationChanges(id: number) {
        if (!hasProvidedEntityId(id)) throw createInvalidRequestHttpException('id must be given');
        return this.publicationChangeService.getPublicationChangesForPublication(id);
    }

    public saveOne(publication: Publication, user?: string) {
        return this.save([publication], { by_user: user });
    }

    public updateEntries(publications: Publication[] | Publication, user?: string) {
        return this.update(Array.isArray(publications) ? publications : [publications], { by_user: user });
    }

    public getDuplicateEntries(id: number, soft?: boolean) {
        if (hasProvidedEntityId(id)) return this.getDuplicates(id);
        return this.getAllDuplicates(soft);
    }

    public saveDuplicateEntry(duplicate: PublicationDuplicate) {
        return this.saveDuplicate(duplicate.id_first, duplicate.id_second, duplicate.description);
    }

    public deleteDuplicateEntry(duplicate: PublicationDuplicate, soft?: boolean) {
        return this.deleteDuplicate(duplicate.id, soft);
    }

    public async save(pub: Publication[], options?: SavePublicationOptions) {
        const manager = options?.manager;
        if (!manager) {
            return this.dataSource.transaction(async (m) => this.save(pub, { ...options, manager: m }));
        }

        await this.ensurePublicationsCanBeSaved(pub, options?.by_user, manager);
        const shouldLogChanges = this.shouldCreatePublicationChange(options);
        const beforeMap = shouldLogChanges ? await this.publicationChangeService.loadPublicationsForChangeLog(pub, manager) : new Map<number, Publication>();
        const ownedCollectionsByIndex = pub.map((publication) => this.publicationRelationService.getPublicationOwnedCollections(publication));
        const publicationsToSave = pub.map((publication) => this.publicationRelationService.withoutPublicationOwnedCollections(publication));

        const saved = await manager.getRepository(Publication).save(publicationsToSave).catch((error: unknown) => {
            throw createPersistenceHttpException(error);
        });

        for (let i = 0; i < saved.length; i++) {
            await this.publicationRelationService.replacePublicationOwnedCollections(saved[i], ownedCollectionsByIndex[i], manager);
        }

        const afterMap = shouldLogChanges ? await this.publicationChangeService.loadPublicationsForChangeLog(saved, manager) : new Map<number, Publication>();
        pub.forEach((publication) => this.syncPublicationLockOwner(publication, options?.by_user));

        if (shouldLogChanges) {
            for (let i = 0; i < saved.length; i++) {
                const savedPub = saved[i];
                if (this.isLockOnlyPayload(pub[i])) continue;
                const before = hasProvidedEntityId(savedPub.id) ? beforeMap.get(savedPub.id) : null;
                const after = hasProvidedEntityId(savedPub.id) ? afterMap.get(savedPub.id) ?? savedPub : savedPub;
                const patch = this.publicationChangeService.buildPublicationChangePatch(before, after);
                if (!patch) continue;
                await this.publicationChangeService.createPublicationChange({
                    publication: { id: savedPub.id },
                    workflowReport: options?.workflowReport,
                    timestamp: new Date(),
                    by_user: options?.by_user,
                    dry_change: options?.dry_change ?? options?.workflowReport?.dry_run ?? false,
                    patch_data: {
                        action: before ? 'update' : 'create',
                        before: patch.before,
                        after: patch.after,
                    }
                }, manager);
            }
        }

        return saved;
    }

    public get(options?: FindManyOptions) {
        return this.pubRepository.find(options);
    }

    public async update(pubs: Publication[], options?: SavePublicationOptions) {
        const manager = options?.manager;
        if (!manager) {
            return this.dataSource.transaction(async (m) => this.update(pubs, { ...options, manager: m }));
        }

        let i = 0;
        await this.ensurePublicationsCanBeSaved(pubs, options?.by_user, manager);
        const shouldLogChanges = this.shouldCreatePublicationChange(options);
        const beforeMap = shouldLogChanges ? await this.publicationChangeService.loadPublicationsForChangeLog(pubs, manager) : new Map<number, Publication>();
        for (const pub of pubs) {
            const orig = shouldLogChanges ? beforeMap.get(pub.id) : undefined;
            const ownedCollections = this.publicationRelationService.getPublicationOwnedCollections(pub);
            const publicationToSave = this.publicationRelationService.withoutPublicationOwnedCollections(pub);
            const savedPub = await manager.getRepository(Publication).save(publicationToSave).catch((error: unknown) => {
                throw createPersistenceHttpException(error);
            });
            await this.publicationRelationService.replacePublicationOwnedCollections(savedPub, ownedCollections, manager);
            if (savedPub) i++;
            this.syncPublicationLockOwner(pub, options?.by_user);
            if (savedPub && shouldLogChanges && !this.isLockOnlyPayload(pub)) {
                const after = hasProvidedEntityId(savedPub.id) ? await this.publicationChangeService.loadPublicationForChangeLog(savedPub.id, manager) : savedPub;
                const patch = this.publicationChangeService.buildPublicationChangePatch(orig, after);
                if (!patch) continue;
                await this.publicationChangeService.createPublicationChange({
                    publication: { id: savedPub.id },
                    workflowReport: options?.workflowReport,
                    timestamp: new Date(),
                    by_user: options?.by_user,
                    dry_change: options?.dry_change ?? options?.workflowReport?.dry_run ?? false,
                    patch_data: {
                        action: 'update',
                        before: patch.before,
                        after: patch.after,
                    }
                }, manager);
            }
        }
        return i;
    }

    public async delete(pubs: Publication[], soft?: boolean) {
        return this.dataSource.transaction(async (manager) => {
            const publicationIds = pubs.map((publication) => publication.id).filter((id): id is number => hasProvidedEntityId(id));
            //always delete changes also for soft deletes to keep db clean
            await this.publicationChangeService.deletePublicationChangesForPublications(publicationIds, manager);
            if (!soft) {
                await this.publicationRelationService.deletePublicationRelations(publicationIds, manager);
                return await manager.getRepository(Publication).delete(publicationIds);
            } else return await manager.getRepository(Publication).softDelete(publicationIds);

        });
    }

    public async getPublication(id: number, reader: boolean, writer: boolean, user?: string) {
        const pub = await this.findPublication(id, reader);
        if (!pub) return null;

        if (writer) {
            const lockedPublication = await this.acquirePublicationEditLock(pub, reader, user);
            return this.filterReaderScopedFields(lockedPublication, reader);
        }

        return this.filterReaderScopedFields(pub, reader);
    }

    async combine(id1: number, ids: number[], alias_strings?: string[], options?: CombinePublicationOptions) {
        return this.dataSource.transaction(async (manager) => {
            return mergeEntities<Publication>({
                repository: this.pubRepository,
                primaryId: id1,
                duplicateIds: ids,
                primaryOptions: {
                    relations: { pub_type: true, oa_category: true, greater_entity: true, publisher: true, contract: true, funders: true, invoices: true, identifiers: true, supplements: true },
                    withDeleted: true
                },
                duplicateOptions: {
                    relations: { authorPublications: true, pub_type: true, oa_category: true, greater_entity: true, publisher: true, contract: true, funders: true, invoices: true, identifiers: true, supplements: true },
                    withDeleted: true
                },
                validate: ({ primary, duplicates }) => {
                    if (!options?.ignoreLocks && (primary.locked || duplicates.some(duplicate => duplicate.locked))) {
                        throw createEntityLockedHttpException();
                    }
                },
                mergeContext: {
                    field: 'publication',
                    pubAutrepository: this.dataSource.getRepository(AuthorPublication),
                    alias_strings,
                    service: this
                },
                afterSave: async ({ duplicateIds, defaultDelete }) => {
                    await this.publicationRelationService.deletePublicationRelations(duplicateIds, manager);
                    await this.publicationChangeService.deletePublicationChangesForPublications(duplicateIds, manager);
                    await defaultDelete();
                },
                manager
            });
        });
    }
    getAllDuplicates(soft?: boolean) {
        if (!soft) return this.dataSource.getRepository(PublicationDuplicate).find();
        else return this.dataSource.getRepository(PublicationDuplicate).find({ where: { delete_date: Not(IsNull()) }, withDeleted: true })
    }

    async getDuplicates(id: number) {
        return this.dataSource.getRepository(PublicationDuplicate).findOne({ where: { id }, withDeleted: true })
    }

    async saveDuplicate(id_first: number, id_second: number, description?: string) {
        const repo = this.dataSource.getRepository(PublicationDuplicate);
        const check = await repo.findOne({ where: { id_first, id_second }, withDeleted: true })
        if (!check) {
            return repo.save({ id_first, id_second, description }).catch((error: unknown) => {
                throw createPersistenceHttpException(error);
            });
        }
        else return null;
    }

    async updateDuplicate(dupl: PublicationDuplicate) {
        return this.dataSource.getRepository(PublicationDuplicate).update(dupl.id, { id: dupl.id, id_first: dupl.id_first, id_second: dupl.id_second, description: dupl.description, delete_date: dupl.delete_date });
    }

    deleteDuplicate(id, soft?: boolean) {
        const repo = this.dataSource.getRepository(PublicationDuplicate);
        if (soft) return repo.softDelete(id);
        else return repo.delete(id);
    }

    private shouldCreatePublicationChange(options?: SavePublicationOptions): boolean {
        return hasProvidedEntityId(options?.workflowReport?.id) || !!options?.by_user;
    }

    private isLockOnlyPayload(publication?: Publication): boolean {
        if (!publication) return false;
        const keys = Object.keys(publication).filter((key) => publication[key] !== undefined);
        return keys.length > 0 && keys.every((key) => key === 'id' || key === 'locked_at');
    }

    public async ensureScopedEntityEditable(scope: string, entity: EditLockableEntity | null | undefined, user?: string): Promise<void> {
        if (!hasProvidedEntityId(entity?.id)) return;

        if (!entity.locked_at) {
            EditLockOwnerStore.release(scope, entity.id);
            return;
        }

        const lockTimeoutMs = await this.getLockTimeoutMs();
        if (isExpiredEditLock(entity.locked_at, lockTimeoutMs)) {
            EditLockOwnerStore.release(scope, entity.id);
            return;
        }

        const owner = EditLockOwnerStore.getOwner(scope, entity.id);
        if (user && owner === user) {
            return;
        }

        throw createEntityLockedHttpException();
    }

    private async ensurePublicationsCanBeSaved(publications: Publication[], user?: string, manager?: EntityManager): Promise<void> {
        const ids = publications.map((publication) => publication.id).filter((id): id is number => hasProvidedEntityId(id));
        if (ids.length === 0) return;

        const repo = manager ? manager.getRepository(Publication) : this.pubRepository;
        const existing = await repo.find({
            where: { id: In(ids) },
            withDeleted: true,
        });
        const publicationMap = new Map(existing.map((publication) => [publication.id, publication]));

        for (const publication of publications) {
            if (!hasProvidedEntityId(publication.id)) continue;
            await this.ensureScopedEntityEditable(PUBLICATION_LOCK_SCOPE, publicationMap.get(publication.id), user);
        }
    }

    private async acquirePublicationEditLock(pub: Publication, reader: boolean, user?: string): Promise<Publication> {
        const lockTimeoutMs = await this.getLockTimeoutMs();
        const lockedAt = normalizeEditLockDate(pub.locked_at);

        if (lockedAt && !isExpiredEditLock(lockedAt, lockTimeoutMs)) {
            if (user && EditLockOwnerStore.getOwner(PUBLICATION_LOCK_SCOPE, pub.id) === user) {
                return { ...pub, locked_at: undefined };
            }
            return pub;
        }

        const now = new Date();
        const lockCriteria = !lockedAt
            ? { id: pub.id, locked_at: IsNull() }
            : { id: pub.id, locked_at: LessThan(new Date(now.getTime() - lockTimeoutMs)) };

        const updateResult = await this.pubRepository.update(lockCriteria as never, { locked_at: now } as never);
        if (!updateResult.affected) {
            return (await this.findPublication(pub.id, reader)) ?? pub;
        }

        if (user && hasProvidedEntityId(pub.id)) {
            EditLockOwnerStore.setOwner(PUBLICATION_LOCK_SCOPE, pub.id, user);
        }

        return { ...pub, locked_at: undefined };
    }

    private syncPublicationLockOwner(publication: Publication, user?: string): void {
        if (!hasProvidedEntityId(publication?.id)) return;

        const hasExplicitLockState = Object.prototype.hasOwnProperty.call(publication, 'locked_at');
        if (hasExplicitLockState && !publication.locked_at) {
            EditLockOwnerStore.release(PUBLICATION_LOCK_SCOPE, publication.id);
            return;
        }

        if (user) {
            EditLockOwnerStore.setOwner(PUBLICATION_LOCK_SCOPE, publication.id, user);
        }
    }

    private async findPublication(id: number, reader: boolean): Promise<Publication | null> {
        let invoice: boolean | FindOptionsRelations<Invoice> = false;
        if (reader) invoice = { cost_items: { cost_type: true }, cost_center: true };
        return this.pubRepository.findOne({
            where: { id }, relations: {
                oa_category: true,
                invoices: invoice,
                authorPublications: {
                    author: {
                        institutes: true
                    },
                    institute: true,
                    role: true
                },
                greater_entity: true,
                pub_type: true,
                publisher: true,
                contract: true,
                funders: true,
                language: true,
                identifiers: true,
                supplements: true
            }, withDeleted: true
        });
    }

    private filterReaderScopedFields(pub: Publication, reader: boolean): Publication {
        if (!pub || reader) return pub;

        pub.add_info = undefined;
        pub.authorPublications?.forEach(authorPublication => {
            if (authorPublication.author) {
                authorPublication.author.internal_remark = undefined;
            }
        });

        return pub;
    }

    private async getLockTimeoutMs(): Promise<number> {
        const timeoutInMinutes = Number(await this.configService.get('lock_timeout'));
        const resolvedMinutes = Number.isFinite(timeoutInMinutes) && timeoutInMinutes >= 0 ? timeoutInMinutes : 5;
        return resolvedMinutes * 60 * 1000;
    }

}
