import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, FindManyOptions, ILike, In, Repository, SelectQueryBuilder } from 'typeorm';
import { CompareOperation, JoinOperation, SearchFilter } from '../../../../output-interfaces/Config';
import { PublicationIndex } from '../../../../output-interfaces/PublicationIndex';
import { Author } from '../../entity/Author';
import { AuthorPublication } from '../../entity/AuthorPublication';
import { CostItem } from '../../entity/CostItem';
import { Institute } from '../../entity/Institute';
import { Invoice } from '../../entity/Invoice';
import { Publication } from '../../entity/Publication';
import { Role } from '../../entity/Role';

@Injectable()
export class PublicationService {
    doi_regex = new RegExp('^10\.[0-9]{4,9}/[-._;()/:A-Z0-9]+$', 'i');

    funder = false;
    author = false;
    identifiers = false;
    pub_type = false;

    constructor(@InjectRepository(Publication) private pubRepository: Repository<Publication>,
        @InjectRepository(AuthorPublication) private pubAutRepository: Repository<AuthorPublication>,
        @InjectRepository(Invoice) private invoiceRepository: Repository<Invoice>,
        @InjectRepository(CostItem) private costItemRepository: Repository<CostItem>,
        private configService: ConfigService) { }

    public save(pub: Publication[]) {
        return this.pubRepository.save(pub).catch(err => {
            if (err.constraint) throw new BadRequestException(err.detail)
            else throw new InternalServerErrorException(err);
        });
    }

    public get(options?: FindManyOptions) {
        return this.pubRepository.find(options);
    }

    public async getAll(filter: SearchFilter) {
        let query = this.pubRepository.createQueryBuilder("publication")
            .leftJoinAndSelect("publication.publisher", 'publisher')
            .leftJoinAndSelect("publication.oa_category", "oa_category")
            .leftJoinAndSelect("publication.pub_type", "publication_type")
            .leftJoinAndSelect("publication.contract", "contract")
            .leftJoinAndSelect("publication.greater_entity", "greater_entity")
            .leftJoinAndSelect("publication.funders", "funders")
            .leftJoinAndSelect("publication.authorPublications", "authorPublications")
            .leftJoinAndSelect("authorPublications.author", "author")
            .leftJoinAndSelect("authorPublications.institute", "institute")
            .leftJoinAndSelect("publication.invoices", "invoices")
            .leftJoinAndSelect("invoices.cost_items", "cost_items")

        query = this.filter(filter, query);

        let res = await query.getMany();
        return res;
    }

    // base object to select a publication index
    public indexQuery(): SelectQueryBuilder<Publication> {
        let query = this.pubRepository.createQueryBuilder("publication")
            .leftJoin("publication.authorPublications", "authorPublications")
            .leftJoin("authorPublications.author", "author")
            .leftJoin("authorPublications.institute", "institute")
            .select("publication.id", "id")
            .addSelect("publication.locked", "locked")
            .groupBy("publication.id")

        if (this.configService.get("pub_index_columns").includes("title")) {
            query = query.addSelect("publication.title", "title").addGroupBy("publication.title")
        }
        if (this.configService.get("pub_index_columns").includes("doi")) {
            query = query.addSelect("publication.doi", "doi").addGroupBy("publication.doi")
        }
        if (this.configService.get("pub_index_columns").includes("authors")) {
            query = query.addSelect("publication.authors", "authors").addGroupBy("publication.authors")
        }
        if (this.configService.get("pub_index_columns").includes("authors_inst")) {
            query = query.addSelect("STRING_AGG(CASE WHEN (author.last_name IS NOT NULL) THEN CONCAT(author.last_name, ', ', author.first_name) ELSE NULL END, '; ')", "authors_inst")
                .addSelect("STRING_AGG(CASE WHEN \"authorPublications\".\"corresponding\" THEN CONCAT(author.last_name, ', ', author.first_name) ELSE NULL END, '; ')", "corr_author")
        }
        if (this.configService.get("pub_index_columns").includes("corr_inst")) {
            query = query.addSelect("STRING_AGG(CASE WHEN \"authorPublications\".\"corresponding\" THEN \"institute\".\"label\" ELSE NULL END, '; ')", "corr_inst")
        }
        if (this.configService.get("pub_index_columns").includes("greater_entity")) {
            query = query.leftJoin("publication.greater_entity", "greater_entity").addSelect("greater_entity.label", "greater_entity").addGroupBy("greater_entity.label")
        }
        if (this.configService.get("pub_index_columns").includes("oa_category")) {
            query = query.leftJoin("publication.oa_category", "oa_category").addSelect("oa_category.label", "oa_category").addGroupBy("oa_category.label")
        }
        if (this.configService.get("pub_index_columns").includes("locked_status")) {
            query = query.addSelect("CONCAT(CAST(publication.locked_author AS INT),CAST(publication.locked_biblio AS INT),CAST(publication.locked_oa AS INT),CAST(publication.locked_finance AS INT))", "locked_status")
        }
        if (this.configService.get("pub_index_columns").includes("status")) {
            query = query.addSelect("publication.status", "status").addGroupBy("publication.status")
        }
        if (this.configService.get("pub_index_columns").includes("edit_date")) {
            query = query.addSelect("publication.edit_date", "edit_date")
        }
        if (this.configService.get("pub_index_columns").includes("import_date")) {
            query = query.addSelect("publication.import_date", "import_date")
        }
        if (this.configService.get("pub_index_columns").includes("pub_type")) {
            query = query.leftJoin("publication.pub_type", "publication_type").addSelect("publication_type.label", "pub_type").addGroupBy("publication_type.label")
        }
        if (this.configService.get("pub_index_columns").includes("contract")) {
            query = query.leftJoin("publication.contract", "contract").addSelect("contract.label", "contract").addGroupBy("contract.label")
        }
        if (this.configService.get("pub_index_columns").includes("publisher")) {
            query = query.leftJoin("publication.publisher", "publisher").addSelect("publisher.label", "publisher").addGroupBy("publisher.label")
        }
        if (this.configService.get("pub_index_columns").includes("pub_date")) {
            query = query.addSelect("publication.pub_date", "pub_date").addGroupBy("publication.pub_date")
        }
        if (this.configService.get("pub_index_columns").includes("link")) {
            query = query.addSelect("publication.link", "link")
        }
        if (this.configService.get("pub_index_columns").includes("data_source")) {
            query = query.addSelect("publication.dataSource", "data_source")
        }

        //console.log(query.getSql());
        return query;
        //return query.getRawMany() as Promise<PublicationIndex[]>;
    }

    //retrieves publication index for a reporting year
    public index(yop: number): Promise<PublicationIndex[]> {
        let indexQuery = this.indexQuery();

        let beginDate = new Date(Date.UTC(yop, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(yop, 11, 31, 23, 59, 59, 999));

        return indexQuery
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
            .getRawMany() as Promise<PublicationIndex[]>;
    }

    //retrieves publication index for soft deleted publications
    public softIndex(): Promise<PublicationIndex[]> {
        let query = this.indexQuery()
            .withDeleted()
            .where("publication.delete_date is not null")

        //console.log(query.getSql());

        return query.getRawMany() as Promise<PublicationIndex[]>;
    }

    public async update(pubs: Publication[]) {
        //return this.pubRepository.save(pubs);
        let i = 0;
        for (let pub of pubs) {
            let autPub = pub.authorPublications?.map((e) => { return { authorId: e.author.id, publicationId: e.publicationId, corresponding: e.corresponding, institute: e.institute, affiliation: e.affiliation, role: e.role }; })
            if (autPub) {
                pub.authorPublications = autPub;
                await this.resetAuthorPublication(pub);
            }
            if (await this.pubRepository.save(pub)) i++;
        }
        return i;
    }

    public async delete(pubs: Publication[], soft?: boolean) {
        for (let pub of pubs) {
            let pubE = await this.pubRepository.findOne({ where: { id: pub.id }, relations: { authorPublications: true, invoices: { cost_items: true } }, withDeleted: true });
            for (let autPub of pubE.authorPublications) {
                await this.pubAutRepository.delete({ authorId: autPub.authorId, publicationId: autPub.publicationId });
            }
            if (pubE.invoices) for (let inv of pubE.invoices) {
                if (inv.cost_items) for (let ci of inv.cost_items) await this.costItemRepository.delete(ci.id);
                await this.invoiceRepository.delete(inv.id);
            }
        }
        if (!soft) return await this.pubRepository.delete(pubs.map(p => p.id));
        else return await this.pubRepository.softDelete(pubs.map(p => p.id));
    }

    public async getPublication(id: number, reader: boolean, writer: boolean) {
        let invoice: any = false;
        if (reader) invoice = { cost_items: { cost_type: true } };
        let pub = await this.pubRepository.findOne({
            where: { id }, relations: {
                oa_category: true,
                invoices: invoice,
                authorPublications: {
                    author: true,
                    institute: true,
                    role: true
                },
                greater_entity: true,
                pub_type: true,
                publisher: true,
                contract: true,
                funders: true,
                language: true,
                identifiers: true
            }, withDeleted: true
        })
        if (writer && !pub.locked_at) {
            await this.save([{
                id: pub.id,
                locked_at: new Date()
            }]);
        } else if (writer && (new Date().getTime() - pub.locked_at.getTime()) > this.configService.get('lock_timeout') * 60 * 1000) {
            await this.save([{
                id: pub.id,
                locked_at: null
            }]);
            return this.getPublication(id, reader, writer);
        }
        return pub;
    }

    public saveAuthorPublication(author: Author, publication: Publication, corresponding?: boolean, affiliation?: string, institute?: Institute, role?: Role) {
        return this.pubAutRepository.save({ author, publication, corresponding, affiliation, institute, role });
    }

    public getAuthorsPublication(pub: Publication) {
        return this.pubAutRepository.find({ where: { publicationId: pub.id }, relations: { author: true } });
    }

    public async resetAuthorPublication(pub: Publication) {
        let pub_aut = await this.pubAutRepository.findBy({ publicationId: pub.id });
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
        let pub = await this.pubRepository.findOne({
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
                invoices: {
                    cost_items: {
                        cost_type: true
                    }
                }
            },
            withDeleted: true
        })

        return pub;
    }

    getReportingYears() {
        let query = this.pubRepository.createQueryBuilder("publication")
            .select("extract('Year' from pub_date)", 'year')
            .distinct(true)
            .where('pub_date IS NOT NULL')
            .orderBy('year', 'DESC');
        //console.log(query.getSql())
        return query.getRawMany() as Promise<number[]>;
    }

    async combine(id1: number, ids: number[]) {
        let aut1 = await this.pubRepository.findOne({ where: { id: id1 }, relations: { authorPublications: true, pub_type: true, oa_category: true, greater_entity: true, publisher: true, contract: true, funders: true, invoices: true } })
        let authors = []
        for (let id of ids) {
            authors.push(await this.pubRepository.findOne({ where: { id }, relations: { authorPublications: true, pub_type: true, oa_category: true, greater_entity: true, publisher: true, contract: true, funders: true, invoices: true } }))
        }

        if (!aut1 || aut1.locked || authors.find(e => e === null || e === undefined || e.locked)) return { error: 'find' };

        let res = { ...aut1 };
        res.authorPublications = undefined;

        for (let aut of authors) {
            for (let ap of aut.authorPublications) await this.pubAutRepository.save({ publicationId: res.id, authorId: ap.authorId, corresponding: ap.corresponding })

            if (!res.pub_type && aut.pub_type) res.pub_type = aut.pub_type;
            if (!res.oa_category && aut.oa_category) res.oa_category = aut.oa_category;
            if (!res.greater_entity && aut.greater_entity) res.greater_entity = aut.greater_entity;
            if (!res.publisher && aut.publisher) res.publisher = aut.publisher;
            if (!res.contract && aut.contract) res.contract = aut.contract;
            if (!res.authors && aut.authors) res.authors = aut.authors;
            if (!res.doi && aut.doi) res.doi = aut.doi;
            if (!res.link && aut.link) res.link = aut.link;
            if (!res.dataSource && aut.dataSource) res.dataSource = aut.dataSource;
            if (!res.language && aut.language) res.language = aut.language;
            if (!res.second_pub && aut.second_pub) res.second_pub = aut.second_pub;
            if (!res.add_info && aut.add_info) res.add_info = aut.add_info;
            if (!res.is_oa && aut.is_oa) res.is_oa = aut.is_oa;
            if (!res.oa_status && aut.oa_status) res.oa_status = aut.oa_status;
            if (!res.is_journal_oa && aut.is_journal_oa) res.is_journal_oa = aut.is_journal_oa;
            if (!res.best_oa_host && aut.best_oa_host) res.best_oa_host = aut.best_oa_host;
            if (!res.best_oa_license && aut.best_oa_license) res.best_oa_license = aut.best_oa_license;
            if (!res.funders) res.funders = [];
            res.funders.concat(aut.funders)
            if (!res.invoices) res.invoices = [];
            res.invoices.concat(aut.invoices)
        }

        //update publication 1
        if (await this.pubRepository.save(res)) {
            if (await this.pubAutRepository.delete({ publicationId: In(authors.map(e => e.id)) }) && await this.invoiceRepository.delete({ publication: { id: In(authors.map(e => e.id)) } }) && await this.pubRepository.delete({ id: In(authors.map(e => e.id)) })) return res;
            else return { error: 'delete' };
        } else return { error: 'update' };
    }

    // retrieves a publication index based on a filter object
    filterIndex(filter: SearchFilter) {
        return this.filter(filter, this.indexQuery()).getRawMany();
    }

    //processes a filter object and adds where conditions to the index query
    filter(filter: SearchFilter, indexQuery: SelectQueryBuilder<Publication>): SelectQueryBuilder<Publication> {
        this.funder = false;
        this.author = false;
        this.identifiers = false;
        this.pub_type = false;

        //let indexQuery = this.indexQuery();
        let first = false;
        if (filter) for (let expr of filter.expressions) {
            let compareString;
            switch (expr.comp) {
                case CompareOperation.INCLUDES:
                    compareString = this.getWhereStringIncludes(expr.key, expr.value)
                    break;
                case CompareOperation.EQUALS:
                    compareString = this.getWhereStringEquals(expr.key, expr.value)
                    break;
                case CompareOperation.STARTS_WITH:
                    compareString = this.getWhereStringStartsWith(expr.key, expr.value)
                    break;
                case CompareOperation.GREATER_THAN:
                    compareString = "publication." + expr.key + " > '" + expr.value + "'";
                    break;
                case CompareOperation.SMALLER_THAN:
                    compareString = "publication." + expr.key + " < '" + expr.value + "'";
                    break;
                case CompareOperation.IN:
                    compareString = this.getWhereStringIn(expr.key, expr.value)
                    break;
            }
            switch (expr.op) {
                case JoinOperation.AND:
                    if (first) indexQuery = indexQuery.where(compareString);
                    else indexQuery = indexQuery.andWhere(compareString);
                    break;
                case JoinOperation.OR:
                    if (first) indexQuery = indexQuery.where(compareString);
                    else indexQuery = indexQuery.orWhere(compareString);
                    break;
                case JoinOperation.AND_NOT:
                    if (first) indexQuery = indexQuery.where(compareString);
                    else indexQuery = indexQuery.andWhere("NOT " + compareString);
                    break;
            }
        }
        if (this.funder) indexQuery = indexQuery.leftJoin('publication.funders', 'funder')
        if (this.identifiers) indexQuery = indexQuery.leftJoin('publication.identifiers', 'identifier')
        if (this.pub_type) indexQuery = indexQuery.leftJoin('publication.pub_type', 'pub_type')
        //console.log(indexQuery.getSql())
        return indexQuery;
    }

    getWhereStringEquals(key: string, value: string | number) {
        let where = '';
        switch (key) {
            case 'greater_entity':
            case 'oa_category':
            case 'pub_type':
            case 'publisher':
            case 'contract':
            case 'funder':
            case 'institute':
                where = key + ".label = '" + value + "'";
                if (key == 'funder') this.funder = true;
                break;
            case 'author_id':
                where = '\"authorPublications\".\"authorId\"=' + value;
                break;
            case 'author_id_corr':
                where = "\"authorPublications\".\"authorId\"= " + value + " and \"authorPublications\".corresponding";
                break;
            case 'inst_authors':
                this.author = true;
                where = "concat(author.last_name, ', ' ,author.first_name)  = '" + value + "'";
                break;
            case 'contract_id':
                where = 'contract.id=' + value;
                break;
            case 'funder_id':
                where = 'funder.id=' + value;
                this.funder = true;
                break;
            case 'greater_entity_id':
                where = 'greater_entity.id=' + value;
                break;
            case 'oa_category_id':
                where = 'oa_category.id=' + value;
                break;
            case 'pub_type_id':
                where = 'publication_type.id=' + value;
                this.pub_type = true;
                break;
            case 'publisher_id':
                where = 'publisher.id=' + value;
                break;
            case 'other_ids':
                where = "identifier.value='" + value + "'";
                this.identifiers = true;
                break;
            default:
                where = "publication." + key + " = '" + value + "'";
        }
        return where;
    }

    getWhereStringIncludes(key: string, value: string | number) {
        let where = '';
        switch (key) {
            case 'greater_entity':
            case 'oa_category':
            case 'pub_type':
            case 'publisher':
            case 'contract':
            case 'funder':
            case 'institute':
                if (key == 'funder') this.funder = true;
                if (key == 'pub_type') this.pub_type = true;
                where = key + ".label ILIKE '%" + value + "%'";
                break;
            case 'inst_authors':
                this.author = true;
                where = "concat(author.last_name, ', ' ,author.first_name)  ILIKE '%" + value + "%'";
                break;
            case 'other_ids':
                where = "identifier.value ILIKE '%" + value + "%'";
                this.identifiers = true;
                break;
            default:
                where = "publication." + key + " ILIKE '%" + value + "%'";
        }
        return where;
    }

    getWhereStringStartsWith(key: string, value: string | number) {
        let where = '';
        switch (key) {
            case 'greater_entity':
            case 'oa_category':
            case 'pub_type':
            case 'publisher':
            case 'contract':
            case 'funder':
            case 'institute':
                if (key == 'funder') this.funder = true;
                if (key == 'pub_type') this.pub_type = true;
                where = key + ".label ILIKE '" + value + "%'";
                break;
            case 'inst_authors':
                this.author = true;
                where = "concat(author.last_name, ', ' ,author.first_name)  ILIKE '" + value + "%'";
                break;
            case 'other_ids':
                where = "identifier.value ILIKE '" + value + "%'";
                this.identifiers = true;
                break;
            default:
                where = "publication." + key + " ILIKE '" + value + "%'";
        }
        return where;
    }

    getWhereStringIn(key: string, value: string | number) {
        let where = '';
        switch (key) {
            case 'greater_entity':
            case 'oa_category':
            case 'pub_type':
            case 'publisher':
            case 'contract':
            case 'funder':
            case 'institute':
                if (key == 'funder') this.funder = true;
                if (key == 'pub_type') this.pub_type = true;
                where = key + ".label IN " + value;
                break;
            case 'institute_id':
                where = '\"authorPublications\".\"instituteId\" IN ' + value;
                break;
            case 'institute_id_corr':
                where = '\"authorPublications\".\"instituteId\" IN' + value + ' and \"authorPublications\".corresponding';
                break;
            default:
                where = "publication." + key + " IN " + value;
        }
        return where;
    }

}

