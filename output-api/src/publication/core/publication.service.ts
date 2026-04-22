import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, DeepPartial, EntityManager, FindManyOptions, FindOptionsRelations, ILike, In, IsNull, LessThan, Not, Repository, SelectQueryBuilder } from 'typeorm';
import { CompareOperation, JoinOperation, SearchFilter, SearchFilterValue } from '../../../../output-interfaces/Config';
import { PublicationIndex } from '../../../../output-interfaces/PublicationIndex';
import { WorkflowReport as IWorkflowReport } from '../../../../output-interfaces/Workflow';
import { Author } from '../../author/Author.entity';
import { createEntityLockedHttpException, createInvalidRequestHttpException, createPersistenceHttpException } from '../../common/api-error';
import { EditLockableEntity, EditLockOwnerStore, isExpiredEditLock, normalizeEditLockDate } from '../../common/edit-lock';
import { hasProvidedEntityId } from '../../common/entity-id';
import { mergeEntities } from '../../common/merge';
import { AppConfigService } from '../../config/app-config.service';
import { Institute } from '../../institute/Institute.entity';
import { InstituteService } from '../../institute/institute.service';
import { CostItem } from '../../invoice/CostItem.entity';
import { Invoice } from '../../invoice/Invoice.entity';
import { AuthorPublication } from '../relations/AuthorPublication.entity';
import { Role } from '../relations/Role.entity';
import { Publication } from './Publication.entity';
import { PublicationDuplicate } from './PublicationDuplicate.entity';
import { PublicationIdentifier } from './PublicationIdentifier.entity';
import { PublicationSupplement } from './PublicationSupplement.entity';
import { PublicationChangeService } from './publication-change.service';

interface SavePublicationOptions {
    workflowReport?: IWorkflowReport;
    by_user?: string;
    dry_change?: boolean;
    manager?: EntityManager;
}

interface PublicationOwnedCollections {
    authorPublications?: AuthorPublication[];
    identifiers?: PublicationIdentifier[];
    supplements?: PublicationSupplement[];
}

interface GetAllPublicationOptions {
    serializeDates?: boolean;
}

interface FilterPredicate {
    clause: string;
    parameters?: Record<string, unknown>;
}

const PUBLICATION_LOCK_SCOPE = 'publication';
const PUBLICATION_FILTER_FIELDS = new Set<string>([
    'id',
    'authors',
    'title',
    'doi',
    'pub_date',
    'pub_date_submitted',
    'pub_date_accepted',
    'pub_date_print',
    'link',
    'dataSource',
    'second_pub',
    'add_info',
    'import_date',
    'edit_date',
    'delete_date',
    'locked',
    'locked_author',
    'locked_biblio',
    'locked_finance',
    'locked_oa',
    'status',
    'is_oa',
    'oa_status',
    'is_journal_oa',
    'best_oa_host',
    'best_oa_license',
    'locked_at',
    'abstract',
    'volume',
    'issue',
    'first_page',
    'last_page',
    'publisher_location',
    'edition',
    'article_number',
    'page_count',
    'peer_reviewed',
    'cost_approach',
    'cost_approach_currency',
    'not_budget_relevant',
    'grant_number',
    'contract_year',
]);

@Injectable()
export class PublicationService {
    // eslint-disable-next-line no-useless-escape
    doi_regex = new RegExp('10\.[0-9]{4,9}/[-._;()/:A-Z0-9]+', 'i');

    funder = false;
    author = false;
    languageRelation = false;
    identifiers = false;
    pub_type = false;
    cost_center = false;
    ge = false;
    oa_cat = false;
    contract = false;
    publisher = false;
    cost_type = false;
    invoice = false;

    filter_joins: Set<string> = new Set();

    constructor(@InjectRepository(Publication) private pubRepository: Repository<Publication>,
        private configService: AppConfigService,
        private instService: InstituteService,
        private publicationChangeService: PublicationChangeService,
        private dataSource: DataSource) { }

    public async save(pub: Publication[], options?: SavePublicationOptions) {
        const manager = options?.manager;
        if (!manager) {
            return this.dataSource.transaction(async (m) => this.save(pub, { ...options, manager: m }));
        }

        await this.ensurePublicationsCanBeSaved(pub, options?.by_user, manager);
        const shouldLogChanges = this.shouldCreatePublicationChange(options);
        const beforeMap = shouldLogChanges ? await this.loadPublicationsForChangeLog(pub, manager) : new Map<number, Publication>();
        const ownedCollectionsByIndex = pub.map((publication) => this.getPublicationOwnedCollections(publication));
        const publicationsToSave = pub.map((publication) => this.withoutPublicationOwnedCollections(publication));

        const saved = await manager.getRepository(Publication).save(publicationsToSave).catch((error: unknown) => {
            throw createPersistenceHttpException(error);
        });

        for (let i = 0; i < saved.length; i++) {
            await this.replacePublicationOwnedCollections(saved[i], ownedCollectionsByIndex[i], manager);
        }

        const afterMap = shouldLogChanges ? await this.loadPublicationsForChangeLog(saved, manager) : new Map<number, Publication>();
        pub.forEach((publication) => this.syncPublicationLockOwner(publication, options?.by_user));

        if (shouldLogChanges) {
            for (let i = 0; i < saved.length; i++) {
                const savedPub = saved[i];
                if (this.isLockOnlyPayload(pub[i])) continue;
                const before = hasProvidedEntityId(savedPub.id) ? beforeMap.get(savedPub.id) : null;
                const after = hasProvidedEntityId(savedPub.id) ? afterMap.get(savedPub.id) ?? savedPub : savedPub;
                const patch = this.buildPublicationChangePatch(before, after);
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

    public async getAll(filter?: SearchFilter, options?: GetAllPublicationOptions) {
        let query = this.pubRepository.createQueryBuilder("publication")
            .leftJoinAndSelect("publication.publisher", 'publisher')
            .leftJoinAndSelect("publication.oa_category", "oa_category")
            .leftJoinAndSelect("publication.pub_type", "publication_type")
            .leftJoinAndSelect("publication.contract", "contract")
            .leftJoinAndSelect("publication.greater_entity", "greater_entity")
            .leftJoinAndSelect("publication.funders", "funders")
            .leftJoinAndSelect("publication.authorPublications", "authorPublications")
            .leftJoinAndSelect("publication.supplements", "supplements")
            .leftJoinAndSelect("publication.identifiers", "identifiers")
            .leftJoinAndSelect("authorPublications.author", "author")
            .leftJoinAndSelect("authorPublications.institute", "institute")
            .leftJoinAndSelect("publication.invoices", "invoices")
            .leftJoinAndSelect("invoices.cost_items", "cost_items")
            .leftJoinAndSelect("invoices.cost_center", "cost_center")
            .leftJoinAndSelect("cost_items.cost_type", "cost_type")

        this.filter_joins = new Set();
        this.filter_joins.add("publisher")
        this.filter_joins.add("oa_category")
        this.filter_joins.add("publication_type")
        this.filter_joins.add("contract")
        this.filter_joins.add("greater_entity")
        this.filter_joins.add("funders")
        this.filter_joins.add("authorPublications")
        this.filter_joins.add("supplements")
        this.filter_joins.add("identifiers")
        this.filter_joins.add("author")
        this.filter_joins.add("institute")
        this.filter_joins.add("invoice")
        this.filter_joins.add("cost_item")
        this.filter_joins.add("cost_center")
        this.filter_joins.add("cost_type")

        query = await this.filter(filter, query);

        const res = await query.getMany();
        if (!options?.serializeDates) return res;
        return this.serializeExportPublications(res);
    }

    // base object to select a publication index
    public async indexQuery(): Promise<SelectQueryBuilder<Publication>> {
        this.filter_joins = new Set();
        let query = this.pubRepository.createQueryBuilder("publication")
            .leftJoin("publication.authorPublications", "authorPublications")
            .leftJoin("authorPublications.author", "author")
            .leftJoin("authorPublications.institute", "institute")
            .select("publication.id", "id")
            .addSelect("publication.locked", "locked")
            .groupBy("publication.id")

        if ((await this.configService.get("pub_index_columns"))["title"]) {
            query = query.addSelect("publication.title", "title").addGroupBy("publication.title")
        }
        if ((await this.configService.get("pub_index_columns"))["doi"]) {
            query = query.addSelect("publication.doi", "doi").addGroupBy("publication.doi")
        }
        if ((await this.configService.get("pub_index_columns"))["authors"]) {
            query = query.addSelect("publication.authors", "authors").addGroupBy("publication.authors")
        }
        if ((await this.configService.get("pub_index_columns"))["authors_inst"]) {
            query = query.addSelect("STRING_AGG(CASE WHEN (author.last_name IS NOT NULL) THEN CONCAT(author.last_name, ', ', author.first_name) ELSE NULL END, '; ')", "authors_inst")
                .addSelect("STRING_AGG(CASE WHEN \"authorPublications\".\"corresponding\" THEN CONCAT(author.last_name, ', ', author.first_name) ELSE NULL END, '; ')", "corr_author")
        }
        if ((await this.configService.get("pub_index_columns"))["corr_inst"]) {
            query = query.addSelect("STRING_AGG(CASE WHEN \"authorPublications\".\"corresponding\" THEN \"institute\".\"label\" ELSE NULL END, '; ')", "corr_inst")
        }
        if ((await this.configService.get("pub_index_columns"))["greater_entity"]) {
            this.filter_joins.add("greater_entity")
            query = query.leftJoin("publication.greater_entity", "greater_entity").addSelect("greater_entity.label", "greater_entity").addGroupBy("greater_entity.label")
        }
        if ((await this.configService.get("pub_index_columns"))["oa_category"]) {
            this.filter_joins.add("oa_category")
            query = query.leftJoin("publication.oa_category", "oa_category").addSelect("oa_category.label", "oa_category").addGroupBy("oa_category.label")
        }
        if ((await this.configService.get("pub_index_columns"))["locked_status"]) {
            query = query.addSelect("CONCAT(CAST(publication.locked_author AS INT),CAST(publication.locked_biblio AS INT),CAST(publication.locked_oa AS INT),CAST(publication.locked_finance AS INT))", "locked_status")
        }
        if ((await this.configService.get("pub_index_columns"))["status"]) {
            query = query.addSelect("publication.status", "status").addGroupBy("publication.status")
        }
        if ((await this.configService.get("pub_index_columns"))["edit_date"]) {
            query = query.addSelect("publication.edit_date", "edit_date")
        }
        if ((await this.configService.get("pub_index_columns"))["import_date"]) {
            query = query.addSelect("publication.import_date", "import_date")
        }
        if ((await this.configService.get("pub_index_columns"))["pub_type"]) {
            this.filter_joins.add("publication_type")
            query = query.leftJoin("publication.pub_type", "publication_type").addSelect("publication_type.label", "pub_type").addGroupBy("publication_type.label")
        }
        if ((await this.configService.get("pub_index_columns"))["contract"]) {
            this.filter_joins.add("contract")
            query = query.leftJoin("publication.contract", "contract").addSelect("contract.label", "contract").addGroupBy("contract.label")
        }
        if ((await this.configService.get("pub_index_columns"))["publisher"]) {
            this.filter_joins.add("publisher")
            query = query.leftJoin("publication.publisher", "publisher").addSelect("publisher.label", "publisher").addGroupBy("publisher.label")
        }
        if ((await this.configService.get("pub_index_columns"))["pub_date"]) {
            query = query.addSelect("publication.pub_date", "pub_date").addGroupBy("publication.pub_date")
        }
        if ((await this.configService.get("pub_index_columns"))["link"]) {
            query = query.addSelect("publication.link", "link")
        }
        if ((await this.configService.get("pub_index_columns"))["data_source"]) {
            query = query.addSelect("publication.dataSource", "data_source")
        }

        //console.log(query.getSql());
        return query;
        //return query.getRawMany() as Promise<PublicationIndex[]>;
    }

    //retrieves publication index for a reporting year
    public async index(yop: number): Promise<PublicationIndex[]> {
        const indexQuery = this.indexQuery();
        let query;
        if (yop) {
            const beginDate = new Date(Date.UTC(yop, 0, 1, 0, 0, 0, 0));
            const endDate = new Date(Date.UTC(yop, 11, 31, 23, 59, 59, 999));

            query = (await indexQuery)
                .where('publication.pub_date >= :beginDate', { beginDate })
                .andWhere('publication.pub_date <= :endDate', { endDate })
                .orWhere(new Brackets(qb => {
                    qb.where('publication.pub_date is null')
                        .andWhere(new Brackets(qb => {
                            qb.where('publication.pub_date_print >= :beginDate and publication.pub_date_print <= :endDate', { beginDate, endDate })
                                .orWhere('publication.pub_date_accepted >= :beginDate and publication.pub_date_accepted <= :endDate', { beginDate, endDate })
                                .orWhere('publication.pub_date_submitted >= :beginDate and publication.pub_date_submitted <= :endDate', { beginDate, endDate })
                        }))
                }))
        } else {
            query = (await indexQuery)
                .where('publication.pub_date IS NULL')
                .andWhere('publication.pub_date_print IS NULL')
                .andWhere('publication.pub_date_accepted IS NULL')
                .andWhere('publication.pub_date_submitted IS NULL')

        }
        //console.log(query.getSql());
        return query.getRawMany() as Promise<PublicationIndex[]>;;
    }

    //retrieves publication index for soft deleted publications
    public async softIndex(): Promise<PublicationIndex[]> {
        const query = (await this.indexQuery())
            .withDeleted()
            .where("publication.delete_date is not null")

        //console.log(query.getSql());

        return query.getRawMany() as Promise<PublicationIndex[]>;
    }

    public async update(pubs: Publication[], options?: SavePublicationOptions) {
        const manager = options?.manager;
        if (!manager) {
            return this.dataSource.transaction(async (m) => this.update(pubs, { ...options, manager: m }));
        }

        let i = 0;
        await this.ensurePublicationsCanBeSaved(pubs, options?.by_user, manager);
        const shouldLogChanges = this.shouldCreatePublicationChange(options);
        const beforeMap = shouldLogChanges ? await this.loadPublicationsForChangeLog(pubs, manager) : new Map<number, Publication>();
        for (const pub of pubs) {
            const orig = shouldLogChanges ? beforeMap.get(pub.id) : undefined;
            const ownedCollections = this.getPublicationOwnedCollections(pub);
            const publicationToSave = this.withoutPublicationOwnedCollections(pub);
            const savedPub = await manager.getRepository(Publication).save(publicationToSave).catch((error: unknown) => {
                throw createPersistenceHttpException(error);
            });
            await this.replacePublicationOwnedCollections(savedPub, ownedCollections, manager);
            if (savedPub) i++;
            this.syncPublicationLockOwner(pub, options?.by_user);
            if (savedPub && shouldLogChanges && !this.isLockOnlyPayload(pub)) {
                const after = hasProvidedEntityId(savedPub.id) ? await this.loadPublicationForChangeLog(savedPub.id, manager) : savedPub;
                const patch = this.buildPublicationChangePatch(orig, after);
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
            await this.deletePublicationRelations(publicationIds, manager);
            if (!soft) return await manager.getRepository(Publication).delete(publicationIds);
            else return await manager.getRepository(Publication).softDelete(publicationIds);
        });
    }

    public async getPublication(id: number, reader: boolean, writer: boolean, user?: string) {
        const pub = await this.findPublication(id, reader);
        if (!pub) return null;

        if (writer) {
            return this.acquirePublicationEditLock(pub, reader, user);
        }

        if (!reader) pub.add_info = undefined;
        return pub;
    }

    public async saveAuthorPublication(author: Author, publication: Publication, corresponding?: boolean, affiliation?: string, institute?: Institute, role?: Role, manager?: EntityManager) {
        if (!hasProvidedEntityId(author?.id)) {
            throw createInvalidRequestHttpException('Author id is required to save author publication.');
        }
        if (!hasProvidedEntityId(publication?.id)) {
            throw createInvalidRequestHttpException('Publication id is required to save author publication.');
        }
        const authorId = author.id as number;
        const publicationId = publication.id as number;

        const repo = manager ? manager.getRepository(AuthorPublication) : this.dataSource.getRepository(AuthorPublication);
        return repo.save({
            author: { id: authorId } as Author,
            authorId,
            publication: { id: publicationId } as Publication,
            publicationId,
            corresponding,
            affiliation,
            institute,
            role
        }).catch((error: unknown) => {
            throw createPersistenceHttpException(error);
        });
    }

    public getAuthorsPublication(pub: Publication) {
        return this.dataSource.getRepository(AuthorPublication).find({ where: { publicationId: pub.id }, relations: { author: true } });
    }

    public async resetAuthorPublication(pub: Publication, manager?: EntityManager) {
        if (!hasProvidedEntityId(pub?.id)) {
            throw createInvalidRequestHttpException('Publication id is required to reset author publications.');
        }
        const repo = manager ? manager.getRepository(AuthorPublication) : this.dataSource.getRepository(AuthorPublication);
        return repo.delete({ publicationId: pub.id });
    }

    private getPublicationOwnedCollections(publication: Publication): PublicationOwnedCollections {
        return {
            authorPublications: publication.authorPublications,
            identifiers: publication.identifiers,
            supplements: publication.supplements,
        };
    }

    private withoutPublicationOwnedCollections(publication: Publication): Publication {
        const hasOwnedCollection = ['authorPublications', 'identifiers', 'supplements']
            .some((key) => Object.prototype.hasOwnProperty.call(publication, key));
        if (!hasOwnedCollection) {
            return publication;
        }

        const {
            authorPublications: _authorPublications,
            identifiers: _identifiers,
            supplements: _supplements,
            ...publicationToSave
        } = publication;
        return publicationToSave as Publication;
    }

    private async replacePublicationOwnedCollections(publication: Publication, collections: PublicationOwnedCollections, manager: EntityManager): Promise<void> {
        if (collections.authorPublications !== undefined) {
            publication.authorPublications = await this.replaceAuthorPublications(publication, collections.authorPublications, manager);
        }
        if (collections.identifiers !== undefined) {
            publication.identifiers = await this.replaceIdentifiers(publication, collections.identifiers, manager);
        }
        if (collections.supplements !== undefined) {
            publication.supplements = await this.replaceSupplements(publication, collections.supplements, manager);
        }
    }

    private async replaceAuthorPublications(publication: Publication, authorPublications: AuthorPublication[], manager: EntityManager): Promise<AuthorPublication[]> {
        const publicationId = publication?.id;
        if (!hasProvidedEntityId(publicationId)) {
            throw createInvalidRequestHttpException('Publication id is required to save author publications.');
        }
        const normalizedPublicationId = publicationId as number;

        await manager.getRepository(AuthorPublication).delete({ publicationId: normalizedPublicationId });
        if (!authorPublications || authorPublications.length === 0) return [];

        const normalizedAuthorPublications = authorPublications.map((authorPublication, index) =>
            this.normalizeAuthorPublication(normalizedPublicationId, authorPublication, index),
        );

        return manager.getRepository(AuthorPublication).save(normalizedAuthorPublications).catch((error: unknown) => {
            throw createPersistenceHttpException(error);
        });
    }

    private async replaceIdentifiers(publication: Publication, identifiers: PublicationIdentifier[], manager: EntityManager): Promise<PublicationIdentifier[]> {
        const publicationId = this.requirePublicationId(publication, 'save publication identifiers');
        await manager.getRepository(PublicationIdentifier).delete({ entity: { id: publicationId } });
        if (!identifiers || identifiers.length === 0) return [];

        const normalizedIdentifiers = identifiers.map((identifier) => this.normalizeIdentifier(publicationId, identifier));
        return manager.getRepository(PublicationIdentifier).save(normalizedIdentifiers).catch((error: unknown) => {
            throw createPersistenceHttpException(error);
        });
    }

    private normalizeIdentifier(publicationId: number, identifier: PublicationIdentifier): DeepPartial<PublicationIdentifier> {
        return {
            type: identifier.type?.toLowerCase(),
            value: identifier.value?.toUpperCase(),
            entity: { id: publicationId } as Publication,
        };
    }

    private async replaceSupplements(publication: Publication, supplements: PublicationSupplement[], manager: EntityManager): Promise<PublicationSupplement[]> {
        const publicationId = this.requirePublicationId(publication, 'save publication supplements');
        await manager.getRepository(PublicationSupplement).delete({ publication: { id: publicationId } });
        if (!supplements || supplements.length === 0) return [];

        const normalizedSupplements = supplements.map((supplement) => this.normalizeSupplement(publicationId, supplement));
        return manager.getRepository(PublicationSupplement).save(normalizedSupplements).catch((error: unknown) => {
            throw createPersistenceHttpException(error);
        });
    }

    private normalizeSupplement(publicationId: number, supplement: PublicationSupplement): DeepPartial<PublicationSupplement> {
        return {
            link: supplement.link,
            publication: { id: publicationId } as Publication,
        };
    }

    private requirePublicationId(publication: Publication, operation: string): number {
        const publicationId = publication?.id;
        if (!hasProvidedEntityId(publicationId)) {
            throw createInvalidRequestHttpException(`Publication id is required to ${operation}.`);
        }
        return publicationId;
    }

    private async deletePublicationRelations(publicationIds: number[], manager: EntityManager) {
        const ids = publicationIds.filter((publicationId): publicationId is number => hasProvidedEntityId(publicationId));
        if (ids.length === 0) return;

        const publications = await manager.getRepository(Publication).find({
            where: { id: In(ids) },
            relations: { invoices: { cost_items: true } },
            withDeleted: true,
        });
        const invoiceIds = publications
            .flatMap((publication) => publication.invoices ?? [])
            .map((invoice) => invoice.id)
            .filter((invoiceId): invoiceId is number => hasProvidedEntityId(invoiceId));
        const costItemIds = publications
            .flatMap((publication) => publication.invoices ?? [])
            .flatMap((invoice) => invoice.cost_items ?? [])
            .map((costItem) => costItem.id)
            .filter((costItemId): costItemId is number => hasProvidedEntityId(costItemId));

        await manager.getRepository(AuthorPublication).delete({ publicationId: In(ids) });
        if (costItemIds.length > 0) await manager.getRepository(CostItem).delete(costItemIds);
        if (invoiceIds.length > 0) await manager.getRepository(Invoice).delete(invoiceIds);
        await manager.getRepository(PublicationIdentifier).delete({ entity: { id: In(ids) } });
        await manager.getRepository(PublicationSupplement).delete({ publication: { id: In(ids) } });
        await manager.getRepository(PublicationDuplicate).delete({ id_first: In(ids) });
        await manager.getRepository(PublicationDuplicate).delete({ id_second: In(ids) });
        await this.publicationChangeService.deletePublicationChangesForPublications(ids, manager);
    }

    private normalizeAuthorPublication(
        publicationId: number,
        authorPublication: AuthorPublication,
        index: number,
    ): DeepPartial<AuthorPublication> {
        const authorId = authorPublication?.author?.id ?? authorPublication?.authorId;
        if (!hasProvidedEntityId(authorId)) {
            throw createInvalidRequestHttpException('authorPublications entries require author.id or authorId.', [
                {
                    path: `authorPublications.${index}.author`,
                    code: 'required',
                    message: 'author.id or authorId is required.',
                },
            ]);
        }

        return {
            author: { id: authorId } as Author,
            authorId,
            publication: { id: publicationId } as Publication,
            publicationId,
            corresponding: authorPublication.corresponding,
            affiliation: authorPublication.affiliation,
            institute: authorPublication.institute,
            role: authorPublication.role,
        };
    }

    public isDOIvalid(pub: Publication): boolean {
        return pub.doi && this.doi_regex.test(pub.doi);
    }

    /**
     * @desc checks if title or DOI already already exists in publications from the database
     * @param doi
     * @param title
     */
    public async checkDOIorTitleAlreadyExists(doi: string, title: string) {
        if (!doi) doi = 'empty';
        if (!title) title = 'empty';
        return (await this.pubRepository.findOne({
            where: [
                { doi: ILike(doi.trim() + '%') },
                { title: ILike(title.trim() + '%') }],
            withDeleted: true
        })) !== null;
    }

    /**
     * @desc gets with the DOI and/or Title an existing Pub with all information
     * @param publications
     * @param doi
     * @param title
     */
    public async getPubwithDOIorTitle(doi: string, title: string): Promise<Publication> {
        if (!doi) doi = 'empty';
        if (!title) title = 'empty';
        const pub = await this.pubRepository.findOne({
            where: [
                { doi: ILike(doi.trim() + '%') },
                { title: ILike(title.trim() + '%') }],
            relations: {
                pub_type: true,
                greater_entity: true,
                publisher: true,
                oa_category: true,
                contract: true,
                funders: true,
                language: true,
                identifiers: true,
                supplements: true,
                invoices: {
                    cost_items: {
                        cost_type: true
                    }
                },
                authorPublications: {
                    author: {
                        institutes: true
                    },
                    institute: true,
                    role: true
                }
            },
            withDeleted: true
        });

        return pub;
    }

    getReportingYears() {
        const query = this.pubRepository.createQueryBuilder("publication")
            .select("CASE WHEN publication.pub_date IS NOT NULL THEN extract('Year' from publication.pub_date at time zone 'UTC') " +
                "WHEN publication.pub_date_print IS NOT NULL THEN extract('Year' from publication.pub_date_print at time zone 'UTC') " +
                "WHEN publication.pub_date_accepted IS NOT NULL THEN extract('Year' from publication.pub_date_accepted at time zone 'UTC') " +
                "WHEN publication.pub_date_submitted IS NOT NULL THEN extract('Year' from publication.pub_date_submitted at time zone 'UTC') " +
                "ELSE NULL END"
                , 'year')
            .distinct(true)
            .orderBy('year', 'DESC');
        return query.getRawMany() as Promise<{ year: string }[]>;
    }



    async combine(id1: number, ids: number[], alias_strings?: string[]) {
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
                    if (primary.locked || duplicates.some(duplicate => duplicate.locked)) {
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
                    await this.deletePublicationRelations(duplicateIds, manager);
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

    // retrieves a publication index based on a filter object
    async filterIndex(filter: SearchFilter) {
        return (await this.filter(filter, await this.indexQuery())).getRawMany();
    }

    //processes a filter object and adds where conditions to the index query
    async filter(filter: SearchFilter, indexQuery: SelectQueryBuilder<Publication>): Promise<SelectQueryBuilder<Publication>> {
        this.funder = false;
        this.author = false;
        this.languageRelation = false;
        this.identifiers = false;
        this.pub_type = false;
        this.cost_center = false;
        this.ge = false;
        this.oa_cat = false;
        this.contract = false;
        this.publisher = false;
        this.cost_type = false;
        this.invoice = false;

        let first = true;
        let filterIndex = 0;
        if (filter) for (const expr of filter.expressions) {
            let compareOperation = expr.comp;
            let filterValue: SearchFilterValue = expr.value;

            if (expr.key.includes("institute_id")) {
                const instituteId = Number(expr.value);
                if (!Number.isInteger(instituteId)) {
                    throw createInvalidRequestHttpException(`Invalid institute filter value for ${expr.key}`);
                }
                compareOperation = CompareOperation.IN;
                filterValue = await this.instService.findInstituteIdsIncludingSubInstitutes([instituteId]);
            }

            const predicate = this.buildFilterPredicate(expr.key, compareOperation, filterValue, `filter_${filterIndex}`);
            filterIndex++;
            const clause = expr.op === JoinOperation.AND_NOT ? `NOT (${predicate.clause})` : predicate.clause;

            if (first) {
                indexQuery = indexQuery.where(clause, predicate.parameters);
                first = false;
                continue;
            }

            switch (expr.op) {
                case JoinOperation.AND:
                case JoinOperation.AND_NOT:
                    indexQuery = indexQuery.andWhere(clause, predicate.parameters);
                    break;
                case JoinOperation.OR:
                    indexQuery = indexQuery.orWhere(clause, predicate.parameters);
                    break;
            }
        }
        if (this.funder && !this.filter_joins.has("funder")) indexQuery = indexQuery.leftJoin('publication.funders', 'funder')
        if (this.languageRelation && !this.filter_joins.has("language")) indexQuery = indexQuery.leftJoin('publication.language', 'language')
        if (this.identifiers && !this.filter_joins.has("identifier")) indexQuery = indexQuery.leftJoin('publication.identifiers', 'identifier')
        if (this.pub_type && !this.filter_joins.has("publication_type")) indexQuery = indexQuery.leftJoin('publication.pub_type', 'publication_type')
        if (this.ge && !this.filter_joins.has("greater_entity")) indexQuery = indexQuery.leftJoin('publication.greater_entity', 'greater_entity')
        if (this.oa_cat && !this.filter_joins.has("oa_category")) indexQuery = indexQuery.leftJoin('publication.oa_category', 'oa_category')
        if (this.contract && !this.filter_joins.has("contract")) indexQuery = indexQuery.leftJoin('publication.contract', 'contract')
        if (this.publisher && !this.filter_joins.has("publisher")) indexQuery = indexQuery.leftJoin('publication.publisher', 'publisher')
        if ((this.invoice || this.cost_type) && !this.filter_joins.has("invoice")) indexQuery = indexQuery.leftJoin('publication.invoices', 'invoice')
        if (this.cost_center && !this.filter_joins.has("cost_center")) indexQuery = indexQuery.leftJoin('invoice.cost_center', 'cost_center')

        if (this.cost_type && !this.filter_joins.has("cost_type")) {
            indexQuery = indexQuery.leftJoin('invoice.cost_items', 'cost_item')
            indexQuery = indexQuery.leftJoin('cost_item.cost_type', 'cost_type')
        }
        //console.log(indexQuery.getSql())
        return indexQuery;
    }

    private buildFilterPredicate(key: string, compareOperation: CompareOperation, value: SearchFilterValue, parameterPrefix: string): FilterPredicate {
        switch (compareOperation) {
            case CompareOperation.EQUALS:
                return this.buildEqualsPredicate(key, value, parameterPrefix);
            case CompareOperation.INCLUDES:
                return this.buildLikePredicate(key, value, parameterPrefix, 'contains');
            case CompareOperation.STARTS_WITH:
                return this.buildLikePredicate(key, value, parameterPrefix, 'startsWith');
            case CompareOperation.GREATER_THAN:
                return this.buildComparablePredicate(key, value, parameterPrefix, '>');
            case CompareOperation.SMALLER_THAN:
                return this.buildComparablePredicate(key, value, parameterPrefix, '<');
            case CompareOperation.IN:
                return this.buildInPredicate(key, value, parameterPrefix);
            default:
                throw createInvalidRequestHttpException(`Unsupported compare operation for ${key}`);
        }
    }

    private buildEqualsPredicate(key: string, value: SearchFilterValue, parameterPrefix: string): FilterPredicate {
        if (key === 'invoice_year') {
            const year = Number(Array.isArray(value) ? value[0] : value);
            if (!Number.isInteger(year)) {
                throw createInvalidRequestHttpException('invoice_year must be an integer');
            }
            const beginDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
            const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
            this.invoice = true;
            return {
                clause: `invoice.date > :${parameterPrefix}_beginDate AND invoice.date < :${parameterPrefix}_endDate`,
                parameters: {
                    [`${parameterPrefix}_beginDate`]: beginDate,
                    [`${parameterPrefix}_endDate`]: endDate,
                }
            };
        }

        if (key === 'pub_date' && !value) {
            return {
                clause: 'publication.pub_date IS NULL AND publication.pub_date_print IS NULL AND publication.pub_date_accepted IS NULL AND publication.pub_date_submitted IS NULL'
            };
        }

        if (key === 'inst_authors') {
            return this.buildAuthorNameExistsPredicate(
                `concat(author_filter.last_name, ', ' ,author_filter.first_name) = :${parameterPrefix}`,
                { [parameterPrefix]: String(Array.isArray(value) ? value[0] ?? '' : value ?? '') }
            );
        }

        if (key === 'institute') {
            return this.buildInstituteExistsPredicate(
                `institute_filter.label = :${parameterPrefix}`,
                { [parameterPrefix]: String(Array.isArray(value) ? value[0] ?? '' : value ?? '') }
            );
        }

        if (key === 'author_id') {
            return this.buildAuthorPublicationExistsPredicate(
                [`ap."authorId" = :${parameterPrefix}`],
                { [parameterPrefix]: value }
            );
        }

        if (key === 'author_id_corr') {
            return this.buildAuthorPublicationExistsPredicate(
                [`ap."authorId" = :${parameterPrefix}`, 'ap."corresponding" = true'],
                { [parameterPrefix]: value }
            );
        }

        if (key === 'institute_id') {
            return this.buildAuthorPublicationExistsInPredicate('ap."instituteId"', value, parameterPrefix);
        }

        if (key === 'institute_id_corr') {
            return this.buildAuthorPublicationExistsInPredicate(
                'ap."instituteId"',
                value,
                parameterPrefix,
                ['ap."corresponding" = true']
            );
        }

        const expression = this.resolveFilterExpression(key);
        return {
            clause: `${expression} = :${parameterPrefix}`,
            parameters: { [parameterPrefix]: Array.isArray(value) ? value[0] : value }
        };
    }

    private buildLikePredicate(key: string, value: SearchFilterValue, parameterPrefix: string, mode: 'contains' | 'startsWith'): FilterPredicate {
        const rawValue = String(Array.isArray(value) ? value[0] ?? '' : value ?? '');
        const parameterValue = mode === 'contains' ? `%${rawValue}%` : `${rawValue}%`;

        if (key === 'inst_authors') {
            return this.buildAuthorNameExistsPredicate(
                `concat(author_filter.last_name, ', ' ,author_filter.first_name) ILIKE :${parameterPrefix}`,
                { [parameterPrefix]: parameterValue }
            );
        }

        if (key === 'institute') {
            return this.buildInstituteExistsPredicate(
                `institute_filter.label ILIKE :${parameterPrefix}`,
                { [parameterPrefix]: parameterValue }
            );
        }

        const expression = this.resolveFilterExpression(key);
        return {
            clause: `${expression} ILIKE :${parameterPrefix}`,
            parameters: { [parameterPrefix]: parameterValue }
        };
    }

    private buildComparablePredicate(key: string, value: SearchFilterValue, parameterPrefix: string, operator: '>' | '<'): FilterPredicate {
        const expression = this.resolveFilterExpression(key);
        return {
            clause: `${expression} ${operator} :${parameterPrefix}`,
            parameters: { [parameterPrefix]: Array.isArray(value) ? value[0] : value }
        };
    }

    private buildInPredicate(key: string, value: SearchFilterValue, parameterPrefix: string): FilterPredicate {
        const values = this.normalizeInValues(value);
        if (values.length === 0) return { clause: '1 = 0' };

        if (key === 'inst_authors') {
            return this.buildAuthorNameExistsPredicate(
                `concat(author_filter.last_name, ', ' ,author_filter.first_name) IN (:...${parameterPrefix})`,
                { [parameterPrefix]: values.map((entry) => String(entry)) }
            );
        }

        if (key === 'institute') {
            return this.buildInstituteExistsPredicate(
                `institute_filter.label IN (:...${parameterPrefix})`,
                { [parameterPrefix]: values.map((entry) => String(entry)) }
            );
        }

        if (key === 'institute_id') {
            return this.buildAuthorPublicationExistsPredicate(
                [`ap."instituteId" IN (:...${parameterPrefix})`],
                { [parameterPrefix]: values }
            );
        }

        if (key === 'institute_id_corr') {
            return this.buildAuthorPublicationExistsPredicate(
                [`ap."instituteId" IN (:...${parameterPrefix})`, 'ap."corresponding" = true'],
                { [parameterPrefix]: values }
            );
        }

        const expression = this.resolveFilterExpression(key);
        return {
            clause: `${expression} IN (:...${parameterPrefix})`,
            parameters: { [parameterPrefix]: values }
        };
    }

    private normalizeInValues(value: SearchFilterValue) {
        if (Array.isArray(value)) return value.filter((entry) => entry !== undefined && entry !== null);
        return value === undefined || value === null ? [] : [value];
    }

    private buildAuthorPublicationExistsInPredicate(
        field: string,
        value: SearchFilterValue,
        parameterPrefix: string,
        extraConditions: string[] = [],
    ): FilterPredicate {
        const values = this.normalizeInValues(value);
        if (values.length === 0) return { clause: '1 = 0' };

        return this.buildAuthorPublicationExistsPredicate(
            [`${field} IN (:...${parameterPrefix})`, ...extraConditions],
            { [parameterPrefix]: values }
        );
    }

    private buildAuthorPublicationExistsPredicate(
        conditions: string[],
        parameters: Record<string, unknown>,
    ): FilterPredicate {
        return {
            clause: `EXISTS (SELECT 1 FROM author_publication ap WHERE ap."publicationId" = publication.id AND ${conditions.join(' AND ')})`,
            parameters,
        };
    }

    private buildAuthorNameExistsPredicate(condition: string, parameters: Record<string, unknown>): FilterPredicate {
        return {
            clause: `EXISTS (SELECT 1 FROM author_publication ap INNER JOIN author author_filter ON author_filter.id = ap."authorId" WHERE ap."publicationId" = publication.id AND ${condition})`,
            parameters,
        };
    }

    private buildInstituteExistsPredicate(condition: string, parameters: Record<string, unknown>): FilterPredicate {
        return {
            clause: `EXISTS (SELECT 1 FROM author_publication ap INNER JOIN institute institute_filter ON institute_filter.id = ap."instituteId" WHERE ap."publicationId" = publication.id AND ${condition})`,
            parameters,
        };
    }

    private resolveFilterExpression(key: string) {
        switch (key) {
            case 'greater_entity':
                this.ge = true;
                return 'greater_entity.label';
            case 'oa_category':
                this.oa_cat = true;
                return 'oa_category.label';
            case 'pub_type':
                this.pub_type = true;
                return 'publication_type.label';
            case 'publisher':
                this.publisher = true;
                return 'publisher.label';
            case 'contract':
                this.contract = true;
                return 'contract.label';
            case 'funder':
                this.funder = true;
                return 'funder.label';
            case 'institute':
                return 'institute.label';
            case 'cost_center':
                this.cost_center = true;
                this.invoice = true;
                return 'cost_center.label';
            case 'cost_type':
                this.cost_type = true;
                return 'cost_type.label';
            case 'language':
                this.languageRelation = true;
                return 'language.label';
            case 'other_ids':
                this.identifiers = true;
                return 'identifier.value';
            case 'contract_id':
                this.contract = true;
                return 'contract.id';
            case 'funder_id':
                this.funder = true;
                return 'funder.id';
            case 'greater_entity_id':
                this.ge = true;
                return 'greater_entity.id';
            case 'oa_category_id':
                this.oa_cat = true;
                return 'oa_category.id';
            case 'pub_type_id':
                this.pub_type = true;
                return 'publication_type.id';
            case 'publisher_id':
                this.publisher = true;
                return 'publisher.id';
            case 'cost_center_id':
                this.cost_center = true;
                this.invoice = true;
                return 'cost_center.id';
            case 'cost_type_id':
                this.cost_type = true;
                this.invoice = true;
                return 'cost_type.id';
            case 'secound_pub':
                return 'publication.second_pub';
            default:
                if (PUBLICATION_FILTER_FIELDS.has(key)) return `publication.${key}`;
                throw createInvalidRequestHttpException(`Unsupported filter key: ${key}`);
        }
    }

    private async loadPublicationsForChangeLog(pubs: Publication[], manager?: EntityManager): Promise<Map<number, Publication>> {
        const ids = pubs.map((publication) => publication.id).filter((id): id is number => hasProvidedEntityId(id));
        if (ids.length === 0) return new Map<number, Publication>();

        const repo = manager ? manager.getRepository(Publication) : this.pubRepository;
        const existing = await repo.find({
            where: { id: In(ids) },
            relations: {
                pub_type: true,
                oa_category: true,
                greater_entity: true,
                publisher: true,
                contract: true,
                funders: true,
                invoices: {
                    cost_items: {
                        cost_type: true
                    },
                    cost_center: true
                },
                language: true,
                identifiers: true,
                supplements: true,
                authorPublications: {
                    author: true,
                    institute: true,
                    role: true
                }
            },
            withDeleted: true
        });

        return new Map(existing.map((publication) => [publication.id, publication]));
    }

    private async loadPublicationForChangeLog(id: number, manager?: EntityManager): Promise<Publication | null> {
        return (await this.loadPublicationsForChangeLog([{ id } as Publication], manager)).get(id) ?? null;
    }

    private buildPublicationChangePatch(before?: Publication | null, after?: Publication | null) {
        const beforeSnapshot = before ? this.buildPublicationChangeSnapshot(before) : null;
        const afterSnapshot = after ? this.buildPublicationChangeSnapshot(after) : null;
        const beforePatch = {};
        const afterPatch = {};

        if (!beforeSnapshot && !afterSnapshot) return null;

        const keys = beforeSnapshot
            ? Array.from(new Set([...Object.keys(beforeSnapshot), ...Object.keys(afterSnapshot ?? {})]))
            : Object.keys(afterSnapshot ?? {}).filter((key) => this.hasPublicationChangeValue(afterSnapshot?.[key]));

        for (const key of keys) {
            const beforeValue = beforeSnapshot?.[key];
            const afterValue = afterSnapshot?.[key];

            if (!beforeSnapshot && !this.hasPublicationChangeValue(afterValue)) continue;
            if (this.arePublicationChangeValuesEqual(beforeValue, afterValue)) continue;

            if (beforeSnapshot) beforePatch[key] = beforeValue ?? null;
            if (afterSnapshot) afterPatch[key] = afterValue ?? null;
        }

        if (Object.keys(beforePatch).length === 0 && Object.keys(afterPatch).length === 0) return null;

        return {
            before: Object.keys(beforePatch).length > 0 ? beforePatch : null,
            after: Object.keys(afterPatch).length > 0 ? afterPatch : null,
        };
    }

    private buildPublicationChangeSnapshot(publication: Publication) {
        return {
            authors: publication.authors,
            title: publication.title,
            doi: publication.doi,
            pub_date: this.serializeDate(publication.pub_date),
            pub_date_submitted: this.serializeDate(publication.pub_date_submitted),
            pub_date_accepted: this.serializeDate(publication.pub_date_accepted),
            pub_date_print: this.serializeDate(publication.pub_date_print),
            link: publication.link,
            dataSource: publication.dataSource,
            language: publication.language ? { id: publication.language.id, label: publication.language['label'] } : null,
            add_info: publication.add_info,
            status: publication.status,
            is_oa: publication.is_oa,
            oa_status: publication.oa_status,
            is_journal_oa: publication.is_journal_oa,
            best_oa_host: publication.best_oa_host,
            best_oa_license: publication.best_oa_license,
            abstract: publication.abstract,
            volume: publication.volume,
            issue: publication.issue,
            first_page: publication.first_page,
            last_page: publication.last_page,
            publisher_location: publication.publisher_location,
            edition: publication.edition,
            article_number: publication.article_number,
            page_count: publication.page_count,
            peer_reviewed: publication.peer_reviewed,
            cost_approach: publication.cost_approach,
            cost_approach_currency: publication.cost_approach_currency,
            not_budget_relevant: publication.not_budget_relevant,
            grant_number: publication.grant_number,
            contract_year: publication.contract_year,
            pub_type: publication.pub_type ? { id: publication.pub_type.id, label: publication.pub_type['label'] } : null,
            oa_category: publication.oa_category ? { id: publication.oa_category.id, label: publication.oa_category['label'] } : null,
            greater_entity: publication.greater_entity ? { id: publication.greater_entity.id, label: publication.greater_entity['label'] } : null,
            publisher: publication.publisher ? { id: publication.publisher.id, label: publication.publisher['label'] } : null,
            contract: publication.contract ? { id: publication.contract.id, label: publication.contract['label'] } : null,
            funders: publication.funders?.map((funder) => ({ id: funder.id, label: funder.label, doi: funder.doi })) ?? [],
            invoices: publication.invoices?.map((invoice) => ({
                id: invoice.id,
                number: invoice.number,
                date: this.serializeDate(invoice.date),
                booking_date: this.serializeDate(invoice.booking_date),
                booking_amount: invoice.booking_amount,
                cost_center: invoice.cost_center ? { id: invoice.cost_center.id, label: invoice.cost_center['label'] } : null,
                cost_items: invoice.cost_items?.map((costItem) => ({
                    id: costItem.id,
                    euro_value: costItem.euro_value,
                    orig_value: costItem.orig_value,
                    orig_currency: costItem.orig_currency,
                    vat: costItem.vat,
                    cost_type: costItem.cost_type ? { id: costItem.cost_type.id, label: costItem.cost_type['label'] } : null
                })) ?? []
            })) ?? [],
            identifiers: publication.identifiers?.map((identifier) => ({
                type: identifier.type,
                value: identifier.value
            })) ?? [],
            supplements: publication.supplements?.map((supplement) => ({
                link: supplement.link
            })) ?? [],
            authorPublications: publication.authorPublications?.map((ap) => ({
                author: ap.author ? { id: ap.author.id, last_name: ap.author.last_name, first_name: ap.author.first_name } : { id: ap.authorId },
                institute: ap.institute ? { id: ap.institute.id, label: ap.institute.label } : null,
                role: ap.role ? { id: ap.role.id, label: ap.role.label } : null,
                corresponding: ap.corresponding,
                affiliation: ap.affiliation
            })) ?? []
        };
    }

    private arePublicationChangeValuesEqual(before: unknown, after: unknown): boolean {
        if (before === after) return true;
        if (this.isLogicalEmpty(before) && this.isLogicalEmpty(after)) return true;
        return JSON.stringify(before) === JSON.stringify(after);
    }

    private isLogicalEmpty(value: unknown): boolean {
        return value === null || value === undefined || value === '';
    }

    private hasPublicationChangeValue(value: unknown): boolean {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.length > 0;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object') return Object.keys(value).length > 0;
        return true;
    }

    private serializeDate(date?: Date) {
        return date ? new Date(date).toISOString() : null;
    }

    private serializeExportPublications(publications: Publication[]): Publication[] {
        return publications.map((publication) => this.serializeExportPublication(publication));
    }

    private serializeExportPublication(publication: Publication): Publication {
        let hasChanges = false;
        const serializedPublication: Publication = { ...publication };
        const serializedPublicationRecord = serializedPublication as Record<string, unknown>;

        const publicationDateFields: (keyof Publication)[] = [
            'pub_date',
            'pub_date_submitted',
            'pub_date_accepted',
            'pub_date_print',
            'import_date',
            'edit_date',
            'delete_date',
            'locked_at',
        ];

        for (const field of publicationDateFields) {
            const current = publication[field];
            if (!(current instanceof Date)) continue;
            serializedPublicationRecord[field as string] = current.toISOString();
            hasChanges = true;
        }

        if (publication.invoices?.length) {
            let invoiceChanges = false;
            const serializedInvoices = publication.invoices.map((invoice) => {
                let changed = false;
                const serializedInvoice = { ...invoice };
                const serializedInvoiceRecord = serializedInvoice as Record<string, unknown>;

                if (invoice.date instanceof Date) {
                    serializedInvoiceRecord.date = invoice.date.toISOString();
                    changed = true;
                }
                if (invoice.booking_date instanceof Date) {
                    serializedInvoiceRecord.booking_date = invoice.booking_date.toISOString();
                    changed = true;
                }

                if (changed) {
                    invoiceChanges = true;
                    return serializedInvoice;
                }
                return invoice;
            });

            if (invoiceChanges) {
                serializedPublication.invoices = serializedInvoices;
                hasChanges = true;
            }
        }

        return hasChanges ? serializedPublication : publication;
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

    private async getLockTimeoutMs(): Promise<number> {
        const timeoutInMinutes = Number(await this.configService.get('lock_timeout'));
        const resolvedMinutes = Number.isFinite(timeoutInMinutes) && timeoutInMinutes >= 0 ? timeoutInMinutes : 5;
        return resolvedMinutes * 60 * 1000;
    }

}
