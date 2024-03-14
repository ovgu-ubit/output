import { Injectable } from '@nestjs/common';
import { Publication } from '../../entity/Publication';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, FindManyOptions, FindOptionsWhere, FindOptionsWhereProperty, ILike, In, LessThan, Like, MoreThan, Not, QueryBuilder, Repository, SelectQueryBuilder } from 'typeorm';
import { Author } from '../../entity/Author';
import { AuthorPublication } from '../../entity/AuthorPublication';
import { Invoice } from '../../entity/Invoice';
import { CostItem } from '../../entity/CostItem';
import { Institute } from '../../entity/Institute';
import { PublicationIndex } from '../../../../output-interfaces/PublicationIndex';
import { ConfigService } from '@nestjs/config';
import { CompareOperation, JoinOperation, SearchFilter } from '../../../../output-interfaces/Config';
@Injectable()
export class PublicationService {
    doi_regex = new RegExp('^10\.[0-9]{4,9}/[-._;()/:A-Z0-9]+$', 'i');

    constructor(@InjectRepository(Publication) private pubRepository: Repository<Publication>,
        @InjectRepository(AuthorPublication) private pubAutRepository: Repository<AuthorPublication>,
        @InjectRepository(Invoice) private invoiceRepository: Repository<Invoice>,
        @InjectRepository(CostItem) private costItemRepository: Repository<CostItem>,
        private configService: ConfigService) { }

    public save(pub: Publication[]) {
        return this.pubRepository.save(pub);
    }

    public get(options?: FindManyOptions) {
        return this.pubRepository.find(options);
    }

    public indexQuery() {
        let query = this.pubRepository.createQueryBuilder("publication")
            .leftJoin("publication.publisher", "publisher")
            .leftJoin("publication.authorPublications", "authorPublications")
            .leftJoin("authorPublications.author", "author")
            .leftJoin("authorPublications.institute", "institute")
            .leftJoin("publication.oa_category", "oa_category")
            .leftJoin("publication.pub_type", "publication_type")
            .leftJoin("publication.contract", "contract")
            .leftJoin("publication.greater_entity", "greater_entity")
            .select("publication.id", "id")
            .addSelect("publication.title", "title")
            .addSelect("publication.locked", "locked")
            .addSelect("publication.status", "status")
            .addSelect("publication.dataSource", "data_source")
            .addSelect("publication.edit_date", "edit_date")
            .addSelect("publication.import_date", "import_date")
            .addSelect("publication.link", "link")
            .addSelect("publication.doi", "doi")
            .addSelect("publication.authors", "authors")
            .addSelect("publication.pub_date", "pub_date")
            .addSelect("publisher.label", "publisher")
            .addSelect("publication_type.label", "publication_type")
            .addSelect("oa_category.label", "oa_category")
            .addSelect("contract.label", "contract")
            .addSelect("greater_entity.label", "greater_entity")
            .addSelect("STRING_AGG(CASE WHEN (author.last_name IS NOT NULL) THEN CONCAT(author.last_name, ', ', author.first_name) ELSE NULL END, '; ')", "authors_inst")
            .addSelect("STRING_AGG(CASE WHEN \"authorPublications\".\"corresponding\" THEN CONCAT(author.last_name, ', ', author.first_name) ELSE NULL END, '; ')", "corr_author")
            .addSelect("STRING_AGG(CASE WHEN \"authorPublications\".\"corresponding\" THEN \"institute\".\"label\" ELSE NULL END, '; ')", "corr_inst")
            .groupBy("publication.id")
            .addGroupBy("publication.title")
            .addGroupBy("publication.doi")
            .addGroupBy("publication.authors")
            .addGroupBy("publication.pub_date")
            .addGroupBy("publisher.label")
            .addGroupBy("oa_category.label")
            .addGroupBy("publication_type.label")
            .addGroupBy("contract.label")
            .addGroupBy("greater_entity.label")

        //console.log(query.getSql());
        return query;
        //return query.getRawMany() as Promise<PublicationIndex[]>;
    }

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
                    qb.where('publication.pub_date_print >= :beginDate and publication.pub_date_print <= :endDate', {beginDate, endDate})
                    .orWhere('publication.pub_date_accepted >= :beginDate and publication.pub_date_accepted <= :endDate', {beginDate, endDate})
                    .orWhere('publication.pub_date_submitted >= :beginDate and publication.pub_date_submitted <= :endDate', {beginDate, endDate})
                }))
            }))
            .getRawMany() as Promise<PublicationIndex[]>;
    }

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
            let autPub = pub.authorPublications?.map((e) => { return { authorId: e.author.id, publicationId: e.publicationId, corresponding: e.corresponding, institute: e.institute, affiliation: e.affiliation }; })
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
            let pubE = await this.pubRepository.findOne({ where: { id: pub.id }, relations: { authorPublications: true, invoices: { cost_items: true } } });
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
                    institute: true
                },
                greater_entity: true,
                pub_type: true,
                publisher: true,
                contract: true,
                funders: true,
                language: true
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

    public saveAuthorPublication(author: Author, publication: Publication, corresponding?: boolean, affiliation?: string, institute?: Institute) {
        return this.pubAutRepository.save({ author, publication, corresponding, affiliation, institute });
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

    public filterPublicationsForValidDOI(): Promise<Publication[]> {
        return this.pubRepository.createQueryBuilder('publication')
            .where("publication.doi ~* :regexDOI", { regexDOI: '^10\.[0-9]{4,9}/[-._;()/:A-Z0-9]+$' })
            .getMany();
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
     * @desc checks if DOI already already exists in publications from the database
     * @param doi
     */
    public checkDOIAlreadyExists(doi: string) {
        if (!doi) return false;
        return this.pubRepository.findOneBy({ doi: doi.toLowerCase().trim() }) != null;
    }

    /**
     * @desc gets with the DOI and/or Title an existing Pub with all information
     * @param publications
     * @param doi
     * @param title
     */
    public getPubwithDOIorTitle(doi: string, title: string): Promise<Publication> {
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
                invoices: {
                    cost_items: {
                        cost_type: true
                    }
                }
            },
            withDeleted: true

        })
    }

    /**
   * @desc Remove the URL-part of the given DOI 
   * @param doi
   */
    public cleanDOI(doi) {
        if (doi) {
            let replace = /[htps]*:\/\/[a-zA-z.]*.[a-zA-z]*\//;
            return doi.replace(replace, "");
        }
        return '';
    }

    /**
     * @desc gets with the DOI and/or Title ONLY the ID of an existing Pub
     * @param publications
     * @param doi
     * @param title
     */
    public getIDwithDOIorTitle(publications: Publication[], doi: string, title: string) {
        let foundTitle = publications.find(e => e.title.toLowerCase() === title.toLowerCase());
        let foundDOI = publications.find(e => e.doi.toLowerCase() === doi.toLowerCase());
        if (foundDOI && doi != "") {
            return foundDOI.id;
        }
        if (foundTitle && title != "") {
            return foundTitle.id;
        }
    }

    public processDOI(doi: string): string {
        if (!doi) return '';
        return doi.replace('https://doi.org/', '');
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

    async filter(filter: SearchFilter): Promise<PublicationIndex[]> {

        let indexQuery = this.indexQuery();
        let first = false;
        for (let expr of filter.expressions) {
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
                    compareString = "publication." + expr.key + " > '" + expr.value+"'";
                    break;
                case CompareOperation.SMALLER_THAN:
                    compareString = "publication." + expr.key + " < '" + expr.value+"'";
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
                    else indexQuery = indexQuery.andWhere("NOT "+compareString);
                    break;
            }
        }
        //console.log(indexQuery.getSql())

        return indexQuery.getRawMany() as Promise<PublicationIndex[]>
    }

    getWhereStringEquals(key: string, value: string | number) {
        let where = '';
        switch (key) {
            case 'greater_entity':
            case 'oa_category':
            case 'pub_type':
            case 'publisher':
            case 'contract':
                where = key + ".label = '" + value + "'";
                break;
            default:
                where = "publication." + key + " = " + value;
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
                where = key + ".label ILIKE '%" + value + "%'";
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
                where = key + ".label ILIKE '" + value + "%'";
                break;
            default:
                where = "publication." + key + " ILIKE '" + value + "%'";
        }
        return where;
    }

}

