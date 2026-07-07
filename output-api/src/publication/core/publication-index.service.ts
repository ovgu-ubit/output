import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CompareOperation, JoinOperation, PublicationIndex, SearchFilter, SearchFilterValue } from '@output/interfaces';
import {
    Between,
    Brackets,
    ILike,
    Repository,
    SelectQueryBuilder
} from 'typeorm';
import { createInternalErrorHttpException, createInvalidRequestHttpException } from '../../common/api-error';
import { AppConfigService } from '../../config/app-config.service';
import { InstituteService } from '../../institute/institute.service';
import { Publication } from './Publication.entity';

export interface GetAllPublicationOptions {
    serializeDates?: boolean;
}

interface FilterPredicate {
    clause: string;
    parameters?: Record<string, unknown>;
}

type PublicationFilterJoin =
    | 'contract'
    | 'cost_center'
    | 'cost_type'
    | 'funder'
    | 'greater_entity'
    | 'identifier'
    | 'invoice'
    | 'language'
    | 'oa_category'
    | 'publication_type'
    | 'publisher';

interface PublicationFilterContext {
    joinedRelations: Set<string>;
    requestedJoins: Set<PublicationFilterJoin>;
}

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
export class PublicationIndexService {
    constructor(
        @InjectRepository(Publication) private pubRepository: Repository<Publication>,
        private configService: AppConfigService,
        private instService: InstituteService,
    ) { }

    public async getAllForReportingYear(yop: number | null | undefined, reader = false) {
        let reportingYear = yop;
        if (!reportingYear) {
            reportingYear = Number(await this.configService.get('reporting_year'));
        }

        const beginDate = new Date(Date.UTC(reportingYear, 0, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(reportingYear, 11, 31, 23, 59, 59, 999));

        const publications = await this.pubRepository.find({
            where: [{ pub_date: Between(beginDate, endDate) }],
            relations: {
                oa_category: true,
                invoices: reader,
                authorPublications: {
                    author: true,
                    institute: true,
                },
                greater_entity: true,
                pub_type: true,
                publisher: true,
                contract: true,
                funders: true,
            }
        }).catch((error: unknown) => {
            console.log(error);
            throw createInternalErrorHttpException();
        });

        return this.filterAuthorInternalRemarks(publications, reader);
    }

    private filterAuthorInternalRemarks(publications: Publication[], reader: boolean): Publication[] {
        if (reader) return publications;

        publications.forEach(publication => {
            publication.authorPublications?.forEach(authorPublication => {
                if (authorPublication.author) {
                    authorPublication.author.internal_remark = undefined;
                }
            });
        });

        return publications;
    }

    public async getIndexEntries(yop: number, soft?: boolean, canReadNetCosts = false): Promise<PublicationIndex[]> {
        if ((yop === null || yop === undefined) && !soft) {
            throw createInvalidRequestHttpException('reporting year or soft has to be given');
        }

        if (soft) return this.softIndex(canReadNetCosts);

        const reportingYear = Number(yop);
        if (Number.isNaN(reportingYear)) return this.index(null, canReadNetCosts);
        return this.index(reportingYear, canReadNetCosts);
    }

    public async getAll(filter?: SearchFilter, options?: GetAllPublicationOptions) {
        let query = this.pubRepository.createQueryBuilder("publication")
            .leftJoinAndSelect("publication.publisher", 'publisher')
            .leftJoinAndSelect("publication.oa_category", "oa_category")
            .leftJoinAndSelect("publication.pub_type", "publication_type")
            .leftJoinAndSelect("publication.contract", "contract")
            .leftJoinAndSelect("publication.greater_entity", "greater_entity")
            .leftJoinAndSelect("publication.funders", "funder")
            .leftJoinAndSelect("publication.authorPublications", "authorPublications")
            .leftJoinAndSelect("publication.supplements", "supplements")
            .leftJoinAndSelect("publication.identifiers", "identifier")
            .leftJoinAndSelect("authorPublications.author", "author")
            .leftJoinAndSelect("authorPublications.institute", "institute")
            .leftJoinAndSelect("publication.invoices", "invoice")
            .leftJoinAndSelect("invoice.cost_items", "cost_item")
            .leftJoinAndSelect("invoice.cost_center", "cost_center")
            .leftJoinAndSelect("cost_item.cost_type", "cost_type");

        const filterContext = this.createFilterContext([
            'publisher',
            'oa_category',
            'publication_type',
            'contract',
            'greater_entity',
            'funder',
            'authorPublications',
            'supplements',
            'identifier',
            'author',
            'institute',
            'invoice',
            'cost_item',
            'cost_center',
            'cost_type',
        ]);

        query = await this.filter(filter, query, filterContext);

        const res = await query.getMany();
        if (!options?.serializeDates) return res;
        return this.serializeExportPublications(res);
    }

    public async indexQuery(
        filterContext = this.createFilterContext(),
        canReadNetCosts = false,
    ): Promise<SelectQueryBuilder<Publication>> {
        const pubIndexColumns = (await this.configService.get("pub_index_columns")) ?? {};
        let query = this.pubRepository.createQueryBuilder("publication")
            .leftJoin("publication.authorPublications", "authorPublications")
            .leftJoin("authorPublications.author", "author")
            .leftJoin("authorPublications.institute", "institute")
            .select("publication.id", "id")
            .addSelect("publication.locked", "locked")
            .groupBy("publication.id");

        if (pubIndexColumns["title"]) {
            query = query.addSelect("publication.title", "title").addGroupBy("publication.title");
        }
        if (pubIndexColumns["doi"]) {
            query = query.addSelect("publication.doi", "doi").addGroupBy("publication.doi");
        }
        if (pubIndexColumns["authors"]) {
            query = query.addSelect("publication.authors", "authors").addGroupBy("publication.authors");
        }
        if (pubIndexColumns["authors_inst"]) {
            query = query.addSelect("STRING_AGG(CASE WHEN (author.last_name IS NOT NULL) THEN CONCAT(author.last_name, ', ', author.first_name) ELSE NULL END, '; ')", "authors_inst")
                .addSelect("STRING_AGG(CASE WHEN \"authorPublications\".\"corresponding\" THEN CONCAT(author.last_name, ', ', author.first_name) ELSE NULL END, '; ')", "corr_author");
        }
        if (pubIndexColumns["corr_inst"]) {
            query = query.addSelect("STRING_AGG(CASE WHEN \"authorPublications\".\"corresponding\" THEN \"institute\".\"label\" ELSE NULL END, '; ')", "corr_inst");
        }
        if (pubIndexColumns["greater_entity"]) {
            filterContext.joinedRelations.add("greater_entity");
            query = query.leftJoin("publication.greater_entity", "greater_entity").addSelect("greater_entity.label", "greater_entity").addGroupBy("greater_entity.label");
        }
        if (pubIndexColumns["oa_category"]) {
            filterContext.joinedRelations.add("oa_category");
            query = query.leftJoin("publication.oa_category", "oa_category").addSelect("oa_category.label", "oa_category").addGroupBy("oa_category.label");
        }
        if (pubIndexColumns["locked_status"]) {
            query = query.addSelect("CONCAT(CAST(publication.locked_author AS INT),CAST(publication.locked_biblio AS INT),CAST(publication.locked_oa AS INT),CAST(publication.locked_finance AS INT))", "locked_status");
        }
        if (pubIndexColumns["status"]) {
            query = query.addSelect("publication.status", "status").addGroupBy("publication.status");
        }
        if (pubIndexColumns["edit_date"]) {
            query = query.addSelect("publication.edit_date", "edit_date");
        }
        if (pubIndexColumns["import_date"]) {
            query = query.addSelect("publication.import_date", "import_date");
        }
        if (pubIndexColumns["pub_type"]) {
            filterContext.joinedRelations.add("publication_type");
            query = query.leftJoin("publication.pub_type", "publication_type").addSelect("publication_type.label", "pub_type").addGroupBy("publication_type.label");
        }
        if (pubIndexColumns["contract"]) {
            filterContext.joinedRelations.add("contract");
            query = query.leftJoin("publication.contract", "contract").addSelect("contract.label", "contract").addGroupBy("contract.label");
        }
        if (pubIndexColumns["publisher"]) {
            filterContext.joinedRelations.add("publisher");
            query = query.leftJoin("publication.publisher", "publisher").addSelect("publisher.label", "publisher").addGroupBy("publisher.label");
        }
        if (pubIndexColumns["pub_date"]) {
            query = query.addSelect("publication.pub_date", "pub_date").addGroupBy("publication.pub_date");
        }
        if (pubIndexColumns["link"]) {
            query = query.addSelect("publication.link", "link");
        }
        if (pubIndexColumns["data_source"]) {
            query = query.addSelect("publication.dataSource", "data_source");
        }
        if (canReadNetCosts && pubIndexColumns["net_costs"]) {
            query = query.addSelect(
                'COALESCE((SELECT SUM(net_cost_item.euro_value) FROM cost_item net_cost_item INNER JOIN "invoice" net_invoice ON net_cost_item."invoiceId" = net_invoice.id WHERE net_invoice."publicationId" = publication.id), 0)',
                "net_costs",
            );
        }

        return query;
    }

    public async index(yop: number, canReadNetCosts = false): Promise<PublicationIndex[]> {
        const indexQuery = this.indexQuery(undefined, canReadNetCosts);
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
                                .orWhere('publication.pub_date_submitted >= :beginDate and publication.pub_date_submitted <= :endDate', { beginDate, endDate });
                        }));
                }));
        } else {
            query = (await indexQuery)
                .where('publication.pub_date IS NULL')
                .andWhere('publication.pub_date_print IS NULL')
                .andWhere('publication.pub_date_accepted IS NULL')
                .andWhere('publication.pub_date_submitted IS NULL');
        }
        return query.getRawMany() as Promise<PublicationIndex[]>;
    }

    public async softIndex(canReadNetCosts = false): Promise<PublicationIndex[]> {
        const query = (await this.indexQuery(undefined, canReadNetCosts))
            .withDeleted()
            .where("publication.delete_date is not null");

        return query.getRawMany() as Promise<PublicationIndex[]>;
    }

    public async filterIndex(filter: SearchFilter, canReadNetCosts = false) {
        const filterContext = this.createFilterContext();
        return (await this.filter(filter, await this.indexQuery(filterContext, canReadNetCosts), filterContext)).getRawMany();
    }

    public async filter(
        filter: SearchFilter,
        indexQuery: SelectQueryBuilder<Publication>,
        filterContext = this.createFilterContext(),
    ): Promise<SelectQueryBuilder<Publication>> {
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

            const predicate = this.buildFilterPredicate(expr.key, compareOperation, filterValue, `filter_${filterIndex}`, filterContext);
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
        return this.applyRequestedJoins(indexQuery, filterContext);
    }

    public getReportingYears() {
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

    public isDOIvalid(pub: Publication): boolean {
        return !!(pub.doi && /10\.[0-9]{4,9}\/[-._;()/:A-Z0-9]+/i.test(pub.doi));
    }

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

    public async getPubwithDOIorTitle(doi: string, title: string): Promise<Publication> {
        if (!doi) doi = 'empty';
        if (!title) title = 'empty';
        return this.pubRepository.findOne({
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
    }

    private buildFilterPredicate(
        key: string,
        compareOperation: CompareOperation,
        value: SearchFilterValue,
        parameterPrefix: string,
        filterContext: PublicationFilterContext,
    ): FilterPredicate {
        switch (compareOperation) {
            case CompareOperation.EQUALS:
                return this.buildEqualsPredicate(key, value, parameterPrefix, filterContext);
            case CompareOperation.INCLUDES:
                return this.buildLikePredicate(key, value, parameterPrefix, 'contains', filterContext);
            case CompareOperation.STARTS_WITH:
                return this.buildLikePredicate(key, value, parameterPrefix, 'startsWith', filterContext);
            case CompareOperation.GREATER_THAN:
                return this.buildComparablePredicate(key, value, parameterPrefix, '>', filterContext);
            case CompareOperation.SMALLER_THAN:
                return this.buildComparablePredicate(key, value, parameterPrefix, '<', filterContext);
            case CompareOperation.IN:
                return this.buildInPredicate(key, value, parameterPrefix, filterContext);
            default:
                throw createInvalidRequestHttpException(`Unsupported compare operation for ${key}`);
        }
    }

    private buildEqualsPredicate(
        key: string,
        value: SearchFilterValue,
        parameterPrefix: string,
        filterContext: PublicationFilterContext,
    ): FilterPredicate {
        if (key === 'invoice_year') {
            const year = Number(Array.isArray(value) ? value[0] : value);
            if (!Number.isInteger(year)) {
                throw createInvalidRequestHttpException('invoice_year must be an integer');
            }
            const beginDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
            const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
            this.requestJoin(filterContext, 'invoice');
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

        const expression = this.resolveFilterExpression(key, filterContext);
        return {
            clause: `${expression} = :${parameterPrefix}`,
            parameters: { [parameterPrefix]: Array.isArray(value) ? value[0] : value }
        };
    }

    private buildLikePredicate(
        key: string,
        value: SearchFilterValue,
        parameterPrefix: string,
        mode: 'contains' | 'startsWith',
        filterContext: PublicationFilterContext,
    ): FilterPredicate {
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

        const expression = this.resolveFilterExpression(key, filterContext);
        return {
            clause: `${expression} ILIKE :${parameterPrefix}`,
            parameters: { [parameterPrefix]: parameterValue }
        };
    }

    private buildComparablePredicate(
        key: string,
        value: SearchFilterValue,
        parameterPrefix: string,
        operator: '>' | '<',
        filterContext: PublicationFilterContext,
    ): FilterPredicate {
        const expression = this.resolveFilterExpression(key, filterContext);
        return {
            clause: `${expression} ${operator} :${parameterPrefix}`,
            parameters: { [parameterPrefix]: Array.isArray(value) ? value[0] : value }
        };
    }

    private buildInPredicate(
        key: string,
        value: SearchFilterValue,
        parameterPrefix: string,
        filterContext: PublicationFilterContext,
    ): FilterPredicate {
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

        const expression = this.resolveFilterExpression(key, filterContext);
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

    private resolveFilterExpression(key: string, filterContext: PublicationFilterContext) {
        switch (key) {
            case 'greater_entity':
                this.requestJoin(filterContext, 'greater_entity');
                return 'greater_entity.label';
            case 'oa_category':
                this.requestJoin(filterContext, 'oa_category');
                return 'oa_category.label';
            case 'pub_type':
                this.requestJoin(filterContext, 'publication_type');
                return 'publication_type.label';
            case 'publisher':
                this.requestJoin(filterContext, 'publisher');
                return 'publisher.label';
            case 'contract':
                this.requestJoin(filterContext, 'contract');
                return 'contract.label';
            case 'funder':
                this.requestJoin(filterContext, 'funder');
                return 'funder.label';
            case 'institute':
                return 'institute.label';
            case 'cost_center':
                this.requestJoin(filterContext, 'cost_center');
                this.requestJoin(filterContext, 'invoice');
                return 'cost_center.label';
            case 'cost_type':
                this.requestJoin(filterContext, 'invoice');
                this.requestJoin(filterContext, 'cost_type');
                return 'cost_type.label';
            case 'language':
                this.requestJoin(filterContext, 'language');
                return 'language.label';
            case 'other_ids':
                this.requestJoin(filterContext, 'identifier');
                return 'identifier.value';
            case 'contract_id':
                this.requestJoin(filterContext, 'contract');
                return 'contract.id';
            case 'funder_id':
                this.requestJoin(filterContext, 'funder');
                return 'funder.id';
            case 'greater_entity_id':
                this.requestJoin(filterContext, 'greater_entity');
                return 'greater_entity.id';
            case 'oa_category_id':
                this.requestJoin(filterContext, 'oa_category');
                return 'oa_category.id';
            case 'pub_type_id':
                this.requestJoin(filterContext, 'publication_type');
                return 'publication_type.id';
            case 'publisher_id':
                this.requestJoin(filterContext, 'publisher');
                return 'publisher.id';
            case 'cost_center_id':
                this.requestJoin(filterContext, 'cost_center');
                this.requestJoin(filterContext, 'invoice');
                return 'cost_center.id';
            case 'cost_type_id':
                this.requestJoin(filterContext, 'invoice');
                this.requestJoin(filterContext, 'cost_type');
                return 'cost_type.id';
            case 'secound_pub':
                return 'publication.second_pub';
            default:
                if (PUBLICATION_FILTER_FIELDS.has(key)) return `publication.${key}`;
                throw createInvalidRequestHttpException(`Unsupported filter key: ${key}`);
        }
    }

    private createFilterContext(joinedRelations: Iterable<string> = []): PublicationFilterContext {
        return {
            joinedRelations: new Set(joinedRelations),
            requestedJoins: new Set<PublicationFilterJoin>(),
        };
    }

    private requestJoin(filterContext: PublicationFilterContext, join: PublicationFilterJoin): void {
        filterContext.requestedJoins.add(join);
    }

    private applyRequestedJoins(
        indexQuery: SelectQueryBuilder<Publication>,
        filterContext: PublicationFilterContext,
    ): SelectQueryBuilder<Publication> {
        if (filterContext.requestedJoins.has('funder') && !filterContext.joinedRelations.has('funder')) {
            indexQuery = indexQuery.leftJoin('publication.funders', 'funder');
            filterContext.joinedRelations.add('funder');
        }
        if (filterContext.requestedJoins.has('language') && !filterContext.joinedRelations.has('language')) {
            indexQuery = indexQuery.leftJoin('publication.language', 'language');
            filterContext.joinedRelations.add('language');
        }
        if (filterContext.requestedJoins.has('identifier') && !filterContext.joinedRelations.has('identifier')) {
            indexQuery = indexQuery.leftJoin('publication.identifiers', 'identifier');
            filterContext.joinedRelations.add('identifier');
        }
        if (filterContext.requestedJoins.has('publication_type') && !filterContext.joinedRelations.has('publication_type')) {
            indexQuery = indexQuery.leftJoin('publication.pub_type', 'publication_type');
            filterContext.joinedRelations.add('publication_type');
        }
        if (filterContext.requestedJoins.has('greater_entity') && !filterContext.joinedRelations.has('greater_entity')) {
            indexQuery = indexQuery.leftJoin('publication.greater_entity', 'greater_entity');
            filterContext.joinedRelations.add('greater_entity');
        }
        if (filterContext.requestedJoins.has('oa_category') && !filterContext.joinedRelations.has('oa_category')) {
            indexQuery = indexQuery.leftJoin('publication.oa_category', 'oa_category');
            filterContext.joinedRelations.add('oa_category');
        }
        if (filterContext.requestedJoins.has('contract') && !filterContext.joinedRelations.has('contract')) {
            indexQuery = indexQuery.leftJoin('publication.contract', 'contract');
            filterContext.joinedRelations.add('contract');
        }
        if (filterContext.requestedJoins.has('publisher') && !filterContext.joinedRelations.has('publisher')) {
            indexQuery = indexQuery.leftJoin('publication.publisher', 'publisher');
            filterContext.joinedRelations.add('publisher');
        }
        if (filterContext.requestedJoins.has('invoice') && !filterContext.joinedRelations.has('invoice')) {
            indexQuery = indexQuery.leftJoin('publication.invoices', 'invoice');
            filterContext.joinedRelations.add('invoice');
        }
        if (filterContext.requestedJoins.has('cost_center') && !filterContext.joinedRelations.has('cost_center')) {
            indexQuery = indexQuery.leftJoin('invoice.cost_center', 'cost_center');
            filterContext.joinedRelations.add('cost_center');
        }
        if (filterContext.requestedJoins.has('cost_type') && !filterContext.joinedRelations.has('cost_type')) {
            indexQuery = indexQuery.leftJoin('invoice.cost_items', 'cost_item');
            indexQuery = indexQuery.leftJoin('cost_item.cost_type', 'cost_type');
            filterContext.joinedRelations.add('cost_item');
            filterContext.joinedRelations.add('cost_type');
        }
        return indexQuery;
    }

    private serializeExportPublications(publications: Publication[]): Publication[] {
        return publications.map((publication) => this.serializeExportPublication(publication));
    }

    private serializeExportPublication(publication: Publication): Publication {
        return {
            ...publication,
            import_date: this.serializeDate(publication.import_date),
            edit_date: this.serializeDate(publication.edit_date),
            delete_date: this.serializeDate(publication.delete_date),
            locked_at: this.serializeDate(publication.locked_at),
            pub_date: this.serializeDate(publication.pub_date),
            pub_date_print: this.serializeDate(publication.pub_date_print),
            pub_date_accepted: this.serializeDate(publication.pub_date_accepted),
            pub_date_submitted: this.serializeDate(publication.pub_date_submitted),
            invoices: publication.invoices?.map((invoice) => ({
                ...invoice,
                date: this.serializeDate(invoice.date),
                booking_date: this.serializeDate(invoice.booking_date),
            })),
        };
    }

    private serializeDate(date?: Date) {
        return date ? new Date(date) : date;
    }
}
