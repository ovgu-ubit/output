import { BadRequestException, ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, FindManyOptions, FindOptionsRelations, ILike, In, IsNull, LessThan, Not, Repository, SelectQueryBuilder } from 'typeorm';
import { CompareOperation, JoinOperation, SearchFilter } from '../../../../output-interfaces/Config';
import { PublicationIndex } from '../../../../output-interfaces/PublicationIndex';
import { WorkflowReport as IWorkflowReport } from '../../../../output-interfaces/Workflow';
import { Author } from '../../author/Author.entity';
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
        @InjectRepository(AuthorPublication) private pubAutRepository: Repository<AuthorPublication>,
        @InjectRepository(Invoice) private invoiceRepository: Repository<Invoice>,
        @InjectRepository(CostItem) private costItemRepository: Repository<CostItem>,
        @InjectRepository(PublicationIdentifier) private idRepository: Repository<PublicationIdentifier>,
        @InjectRepository(PublicationSupplement) private supplRepository: Repository<PublicationSupplement>,
        @InjectRepository(PublicationDuplicate) private duplRepository: Repository<PublicationDuplicate>,
        private configService: AppConfigService,
        private instService: InstituteService,
        private publicationChangeService: PublicationChangeService) { }

    public async save(pub: Publication[], options?: SavePublicationOptions) {
        await this.ensurePublicationsCanBeSaved(pub, options?.by_user);
        const shouldLogChanges = this.shouldCreatePublicationChange(options);
        const beforeMap = shouldLogChanges ? await this.loadPublicationsForChangeLog(pub) : new Map<number, Publication>();

        const saved = await this.pubRepository.save(pub).catch(err => {
            if (err.constraint) throw new BadRequestException(err.detail)
            else throw new InternalServerErrorException(err);
        });
        const afterMap = shouldLogChanges ? await this.loadPublicationsForChangeLog(saved) : new Map<number, Publication>();
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
                });
            }
        }

        return saved;
    }

    public get(options?: FindManyOptions) {
        return this.pubRepository.find(options);
    }

    public async getAll(filter: SearchFilter, options?: GetAllPublicationOptions) {
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
        //return this.pubRepository.save(pubs);
        let i = 0;
        await this.ensurePublicationsCanBeSaved(pubs, options?.by_user);
        const shouldLogChanges = this.shouldCreatePublicationChange(options);
        const beforeMap = shouldLogChanges ? await this.loadPublicationsForChangeLog(pubs) : new Map<number, Publication>();
        for (const pub of pubs) {
            const orig = shouldLogChanges
                ? beforeMap.get(pub.id)
                : await this.pubRepository.findOne({ where: { id: pub.id }, relations: { identifiers: true, supplements: true } });
            if (pub.identifiers) {
                for (const id of pub.identifiers) {
                    if (!hasProvidedEntityId(id.id)) {
                        id.value = id.value.toUpperCase();
                        id.type = id.type.toLowerCase();
                        id.id = (await this.idRepository.save(id).catch(err => {
                            if (err.constraint) throw new BadRequestException(err.detail)
                            else throw new InternalServerErrorException(err);
                        })).id;
                    }
                }
            }
            if (pub.supplements) {
                for (const suppl of pub.supplements) {
                    if (!hasProvidedEntityId(suppl.id)) {
                        suppl.id = (await this.supplRepository.save(suppl).catch(err => {
                            if (err.constraint) throw new BadRequestException(err.detail)
                            else throw new InternalServerErrorException(err);
                        })).id;
                    }
                }
            }
            if (pub.identifiers && orig && orig.identifiers) orig.identifiers.forEach(async id => {
                if (!pub.identifiers.find(e => e.id === id.id)) await this.idRepository.delete(id.id)
            })
            if (pub.supplements && orig && orig.supplements) orig.supplements.forEach(async suppl => {
                if (!pub.supplements.find(e => e.id === suppl.id)) await this.supplRepository.delete(suppl.id)
            })

            const autPub = pub.authorPublications?.map((e) => { return { authorId: e.author.id, publicationId: e.publicationId, corresponding: e.corresponding, institute: e.institute, affiliation: e.affiliation, role: e.role }; })
            if (autPub) {
                pub.authorPublications = autPub;
                await this.resetAuthorPublication(pub);
            }
            const savedPub = await this.pubRepository.save(pub);
            if (savedPub) i++;
            this.syncPublicationLockOwner(pub, options?.by_user);
            if (savedPub && shouldLogChanges && !this.isLockOnlyPayload(pub)) {
                const after = hasProvidedEntityId(savedPub.id) ? await this.loadPublicationForChangeLog(savedPub.id) : savedPub;
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
                });
            }
        }
        return i;
    }

    public async delete(pubs: Publication[], soft?: boolean) {
        const publicationIds = pubs.map((publication) => publication.id).filter((id): id is number => hasProvidedEntityId(id));
        for (const pub of pubs) {
            const pubE = await this.pubRepository.findOne({ where: { id: pub.id }, relations: { authorPublications: true, invoices: { cost_items: true }, identifiers: true }, withDeleted: true });
            for (const autPub of pubE.authorPublications) {
                await this.pubAutRepository.delete({ authorId: autPub.authorId, publicationId: autPub.publicationId });
            }
            if (pubE.invoices) for (const inv of pubE.invoices) {
                if (inv.cost_items) for (const ci of inv.cost_items) await this.costItemRepository.delete(ci.id);
                await this.invoiceRepository.delete(inv.id);
            }
            if (pubE.identifiers) for (const id of pubE.identifiers) {
                await this.idRepository.delete(id.id);
            }
            if (pubE.supplements) for (const suppl of pubE.supplements) {
                await this.supplRepository.delete(suppl.id);
            }
        }
        await this.publicationChangeService.deletePublicationChangesForPublications(publicationIds);
        if (!soft) return await this.pubRepository.delete(publicationIds);
        else return await this.pubRepository.softDelete(publicationIds);
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

    public saveAuthorPublication(author: Author, publication: Publication, corresponding?: boolean, affiliation?: string, institute?: Institute, role?: Role) {
        return this.pubAutRepository.save({ author, publication, corresponding, affiliation, institute, role });
    }

    public getAuthorsPublication(pub: Publication) {
        return this.pubAutRepository.find({ where: { publicationId: pub.id }, relations: { author: true } });
    }

    public async resetAuthorPublication(pub: Publication) {
        const pub_aut = await this.pubAutRepository.findBy({ publicationId: pub.id });
        return await this.pubAutRepository.remove(pub_aut);
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
        const duplicatePairs = await this.duplRepository.find({ where: { id_first: id1, id_second: In(ids) }, withDeleted: true });
        const reversePairs = await this.duplRepository.find({ where: { id_first: In(ids), id_second: id1 }, withDeleted: true });
        const duplicateRecords = duplicatePairs.concat(reversePairs);
        const duplicateRecordIds = duplicateRecords.map(record => record.id);

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
                    return 'find';
                }
            },
            mergeContext: {
                field: 'publication',
                pubAutrepository: this.pubAutRepository,
                alias_strings
            },
            afterSave: async ({ duplicateIds, defaultDelete }) => {
                if (duplicateIds.length > 0) {
                    await this.pubAutRepository.delete({ publicationId: In(duplicateIds) });
                    await this.invoiceRepository.delete({ publication: { id: In(duplicateIds) } });
                    await this.supplRepository.delete({ publication: { id: In(duplicateIds) } });
                    await this.publicationChangeService.deletePublicationChangesForPublications(duplicateIds);
                }

                if (duplicateRecordIds.length > 0) {
                    await this.duplRepository.delete(duplicateRecordIds);
                }

                await defaultDelete();
            },
        });
    }
    getAllDuplicates(soft?: boolean) {
        if (!soft) return this.duplRepository.find();
        else return this.duplRepository.find({ where: { delete_date: Not(IsNull()) }, withDeleted: true })
    }

    async getDuplicates(id: number) {
        /*let query = this.pubRepository.createQueryBuilder("publication")
            .leftJoinAndSelect("publication.duplicates", 'duplicates')
            .select("duplicates.id_second")
            .addSelect("duplicates.id")
            .addSelect("duplicates.id_first")
            .where("publication.id = :id", {id: id})

        return (await query.getRawMany());*/
        return this.duplRepository.findOne({ where: { id }, withDeleted: true })
    }

    async saveDuplicate(id_first: number, id_second: number, description?: string) {
        const check = await this.duplRepository.findOne({ where: { id_first, id_second }, withDeleted: true })
        if (!check) return this.duplRepository.save({ id_first, id_second, description })
        else return null;
    }

    async updateDuplicate(dupl: PublicationDuplicate) {
        return this.duplRepository.update(dupl.id, { id: dupl.id, id_first: dupl.id_first, id_second: dupl.id_second, description: dupl.description, delete_date: dupl.delete_date });
    }

    deleteDuplicate(id, soft?: boolean) {
        if (soft) return this.duplRepository.softDelete(id);
        else return this.duplRepository.delete(id);
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
            let filterValue: string | number | Array<string | number> = expr.value;

            if (expr.key.includes("institute_id")) {
                const instituteId = Number(expr.value);
                if (!Number.isInteger(instituteId)) {
                    throw new BadRequestException(`Invalid institute filter value for ${expr.key}`);
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

    private buildFilterPredicate(key: string, compareOperation: CompareOperation, value: string | number | Array<string | number>, parameterPrefix: string): FilterPredicate {
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
                throw new BadRequestException(`Unsupported compare operation for ${key}`);
        }
    }

    private buildEqualsPredicate(key: string, value: string | number | Array<string | number>, parameterPrefix: string): FilterPredicate {
        if (key === 'invoice_year') {
            const year = Number(Array.isArray(value) ? value[0] : value);
            if (!Number.isInteger(year)) {
                throw new BadRequestException('invoice_year must be an integer');
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

    private buildLikePredicate(key: string, value: string | number | Array<string | number>, parameterPrefix: string, mode: 'contains' | 'startsWith'): FilterPredicate {
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

    private buildComparablePredicate(key: string, value: string | number | Array<string | number>, parameterPrefix: string, operator: '>' | '<'): FilterPredicate {
        const expression = this.resolveFilterExpression(key);
        return {
            clause: `${expression} ${operator} :${parameterPrefix}`,
            parameters: { [parameterPrefix]: Array.isArray(value) ? value[0] : value }
        };
    }

    private buildInPredicate(key: string, value: string | number | Array<string | number>, parameterPrefix: string): FilterPredicate {
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

    private normalizeInValues(value: string | number | Array<string | number>) {
        if (Array.isArray(value)) return value.filter((entry) => entry !== undefined && entry !== null);
        return value === undefined || value === null ? [] : [value];
    }

    private buildAuthorPublicationExistsInPredicate(
        field: string,
        value: string | number | Array<string | number>,
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
                throw new BadRequestException(`Unsupported filter key: ${key}`);
        }
    }

    private async loadPublicationsForChangeLog(pubs: Publication[]): Promise<Map<number, Publication>> {
        const ids = pubs.map((publication) => publication.id).filter((id): id is number => hasProvidedEntityId(id));
        if (ids.length === 0) return new Map<number, Publication>();

        const existing = await this.pubRepository.find({
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
                supplements: true
            },
            withDeleted: true
        });

        return new Map(existing.map((publication) => [publication.id, publication]));
    }

    private async loadPublicationForChangeLog(id: number): Promise<Publication | null> {
        return (await this.loadPublicationsForChangeLog([{ id } as Publication])).get(id) ?? null;
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
                id: identifier.id,
                type: identifier.type,
                value: identifier.value
            })) ?? [],
            supplements: publication.supplements?.map((supplement) => ({
                id: supplement.id,
                link: supplement.link
            })) ?? []
        };
    }

    private arePublicationChangeValuesEqual(before: unknown, after: unknown): boolean {
        return JSON.stringify(before) === JSON.stringify(after);
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

        throw new ConflictException('Entity is currently locked.');
    }

    private async ensurePublicationsCanBeSaved(publications: Publication[], user?: string): Promise<void> {
        const ids = publications.map((publication) => publication.id).filter((id): id is number => hasProvidedEntityId(id));
        if (ids.length === 0) return;

        const existing = await this.pubRepository.find({
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
