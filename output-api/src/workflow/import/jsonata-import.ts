import { HttpService } from '@nestjs/axios';
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import jsonata from 'jsonata';
import { concat, delay, firstValueFrom, map, mergeAll, Observable, queueScheduler, scheduled } from 'rxjs';
import { FindManyOptions, In } from 'typeorm';
import { UpdateMapping, UpdateOptions } from '../../../../output-interfaces/Config';
import { AuthorService } from '../../author/author.service';
import { AppConfigService } from '../../config/app-config.service';
import { ContractService } from '../../contract/contract.service';
import { Funder } from '../../funder/Funder.entity';
import { FunderService } from '../../funder/funder.service';
import { GreaterEntityService } from '../../greater_entity/greater-entitiy.service';
import { GreaterEntity } from '../../greater_entity/GreaterEntity.entity';
import { InstituteService } from '../../institute/institute.service';
import { InvoiceService } from '../../invoice/invoice.service';
import { OACategoryService } from '../../oa_category/oa-category.service';
import { PublicationTypeService } from '../../pub_type/publication-type.service';
import { Publication } from '../../publication/core/Publication.entity';
import { PublicationService } from '../../publication/core/publication.service';
import { LanguageService } from '../../publication/lookups/language.service';
import { RoleService } from '../../publication/relations/role.service';
import { Publisher } from '../../publisher/Publisher.entity';
import { PublisherService } from '../../publisher/publisher.service';
import { ReportItemService } from '../report-item.service';
import { AbstractImportService, ImportService } from './abstract-import';
import { EnrichService } from './api-enrich-doi.service';

export interface JSONataParsedObject {
    title?: string;
    doi?: string;
    oa_category?: string;
    authors_inst?: { first_name: string, last_name: string, orcid?: string, affiliation?: string }[];
    authors?: string;
    greater_entity?: { label: string, identifiers?: { type: string, value: string }[] };
    publisher?: { label: string };
    pub_date?: Date;
    pub_date_print?: Date;
    pub_date_accepted?: Date;
    pub_date_submitted?: Date;
    language?: string;
    link?: string;
    funder?: { label: string, doi?: string }[];
    pub_type?: string;
    license?: string;
    status?: number;
    abstract?: string;
    page_count?: number;
    contract?: string;
    invoices?: {
        number?: string, date?: Date, booking_date?: Date, booking_amount?: number, cost_center?: string,
        cost_items: { euro_value?: number, vat?: number, orig_value?: number, orig_currency?: string, cost_type?: string }[]
    }[];
    peer_reviewed: boolean;
    cost_approach: number;
    volume: string;
    issue: string;
    first_page: string,
    last_page: string,
    publisher_location: string,
    edition: string,
    article_number: string,
}

type RequestMode = 'offset' | 'page';

@ImportService({ path: 'jsonata' })
@EnrichService({ path: 'jsonata' })
@Injectable()
export class JSONataImportService extends AbstractImportService {

    constructor(protected publicationService: PublicationService, protected authorService: AuthorService,
        protected geService: GreaterEntityService, protected funderService: FunderService, protected publicationTypeService: PublicationTypeService,
        protected publisherService: PublisherService, protected oaService: OACategoryService, protected contractService: ContractService,
        protected invoiceService: InvoiceService, protected reportService: ReportItemService, protected instService: InstituteService,
        protected languageService: LanguageService, protected roleService: RoleService, protected configService: AppConfigService, protected http: HttpService) {
        super(publicationService, authorService, geService, funderService, publicationTypeService, publisherService, oaService, contractService, reportService, instService, languageService, roleService, invoiceService, configService);
    }

    protected updateMapping: UpdateMapping = {
        author_inst: UpdateOptions.IGNORE,
        authors: UpdateOptions.REPLACE_IF_EMPTY,
        title: UpdateOptions.REPLACE_IF_EMPTY,
        pub_type: UpdateOptions.REPLACE_IF_EMPTY,
        oa_category: UpdateOptions.REPLACE_IF_EMPTY,
        greater_entity: UpdateOptions.REPLACE_IF_EMPTY,
        publisher: UpdateOptions.REPLACE_IF_EMPTY,
        contract: UpdateOptions.REPLACE_IF_EMPTY,
        funder: UpdateOptions.APPEND,
        doi: UpdateOptions.REPLACE_IF_EMPTY,
        pub_date: UpdateOptions.REPLACE_IF_EMPTY,
        link: UpdateOptions.REPLACE_IF_EMPTY,
        language: UpdateOptions.REPLACE_IF_EMPTY,
        license: UpdateOptions.REPLACE_IF_EMPTY,
        invoice: UpdateOptions.REPLACE_IF_EMPTY,
        status: UpdateOptions.REPLACE_IF_EMPTY,
        abstract: UpdateOptions.REPLACE_IF_EMPTY,
        citation: UpdateOptions.REPLACE_IF_EMPTY,
        page_count: UpdateOptions.REPLACE_IF_EMPTY,
        peer_reviewed: UpdateOptions.REPLACE_IF_EMPTY,
        cost_approach: UpdateOptions.REPLACE_IF_EMPTY,
    };

    private newPublications: Publication[] = [];
    private publicationsUpdate = [];
    private numberOfPublications: number;
    private processedPublications = 0;
    private importConfig: string;

    protected url = 'https://api.crossref.org/works?';
    protected max_res: number = 20;
    protected max_res_name = 'rows';
    protected offset_name = 'offset';
    protected offset_count = 0;
    protected offset_start = 0;
    protected parallelCalls = 1;
    protected delayInMs = 200;

    protected mode: RequestMode = 'offset'

    protected name = 'JSONata-Import'

    private path: string = 'jsonata';
    private searchText = '';
    private affiliationText = '';
    protected search_text_combiner;

    private completeURL = '';

    protected importDefinition;
    protected reporting_year;
    protected query_doi_schema;
    protected get_doi_item;
    public enrich_whereClause;
    protected url_doi;

    private config;

    public async setUp(jsonata: string, importDefinition, updateMapping?: UpdateMapping, enrich_whereClause?: FindManyOptions) {
        this.importConfig = jsonata;
        this.importDefinition = importDefinition;
        this.enrich_whereClause = enrich_whereClause;

        this.url = this.importDefinition.url_items;
        if (!this.url.endsWith('?')) this.url = this.url + '?';
        this.max_res = this.importDefinition.max_res;
        this.max_res_name = this.importDefinition.max_res_name;
        this.mode = this.importDefinition.request_mode;
        this.offset_name = this.importDefinition.offset_name;
        this.offset_count = this.importDefinition.offset_count;
        this.offset_start = this.importDefinition.offset_start;
        this.parallelCalls = this.importDefinition.parallelCalls;
        this.search_text_combiner = this.importDefinition.search_text_combiner
        this.query_doi_schema = this.importDefinition.query_doi_schema;
        this.get_doi_item = this.importDefinition.get_doi_item;
        this.url_doi = this.importDefinition.url_doi;
        this.delayInMs = this.importDefinition.delayInMs;

        if (updateMapping) this.updateMapping = updateMapping;
        this.config = {};
        (await this.configService.listDatabaseConfig('admin')).map(e => {
            this.config[e.key] = e.value;
        });
        (await this.configService.listEnvConfig()).map(e => {
            this.config[e.key] = e.value;
        });
        await this.config['search_tags'].forEach(tag => {
            this.searchText += tag + this.search_text_combiner;
        });
        this.searchText = this.searchText.slice(0, this.searchText.length - this.search_text_combiner.length)

        await this.config['affiliation_tags'].forEach(tag => {
            this.affiliationText += tag + this.search_text_combiner;
        });
        this.affiliationText = this.affiliationText.slice(0, this.affiliationText.length - this.search_text_combiner.length)

        let queryString: string = this.importDefinition.query_search_schema;
        //process query string
        queryString = await this.setVariables(queryString);
        this.url = this.url + queryString;
    }

    async setVariables(queryString: string, doi?: string): Promise<string> {
        let result = queryString;
        const regex = /\[([^\]]+)\]/g
        const keys = [...result.matchAll(regex)].map(m => m[1]);
        const values = await Promise.all(keys.map(k => this.configService.get(k)));
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            let value;
            if (key === 'year') value = this.reporting_year;
            else if (key === 'search_tags') value = this.searchText;
            else if (key === 'doi') value = doi;
            else if (key === 'affiliation_tags') value = this.affiliationText;
            else value = values[i] ?? ""; // oder Fehler werfen

            if (value) result = result.replace(`[${key}]`, value);
            else throw new BadRequestException(`value for ${key} is not available`);
        }
        for (const { key, value } of this.importDefinition.query_additional_params) {
            result += `&${key}=${value}`;
        }
        return result;
    }

    protected async getData(response: any): Promise<JSONataParsedObject[]> {
        try {
            const mapping = jsonata(this.importDefinition.get_items)
            const items = (await mapping.evaluate(response.data))
            return await Promise.all(items.map(e => this.transform(e)))
        } catch (err) {
            console.log(err)
            return null;
        }
    }

    protected async getDataEnrich(response: any): Promise<JSONataParsedObject> {
        try {
            const mapping = jsonata(this.importDefinition.get_doi_item)
            const item = (await mapping.evaluate(response.data))
            return await this.transform(item)
        } catch (err) {
            console.log(err)
            return null;
        }
    }

    public async setReportingYear(year: string) {
        this.reporting_year = year;
    }

    async transform(element: any): Promise<JSONataParsedObject> {
        const mapping = jsonata(this.importConfig)
        const obj = (await mapping.evaluate({ ...element, params: { cfg: this.config } }))
        return obj;
    }

    /**
     * main method for import and updates, retrieves elements from CSV file and saves the mapped entities to the DB
     */
    public async import(update: boolean, by_user?: string, dryRun = false) {
        if (this.progress !== 0) throw new ConflictException('The import is already running, check status for further information.');
        this.dryRun = dryRun;
        //await this.setUp(fs.readFileSync('./templates/import/crossref.jsonata').toString(), JSON.parse(fs.readFileSync('./templates/import/crossref.json').toString()));
        //await this.setUp(fs.readFileSync('./templates/import/openalex.jsonata').toString(), JSON.parse(fs.readFileSync('./templates/import/openalex.json').toString()));
        await this.setUp(fs.readFileSync('./templates/import/scopus.jsonata').toString(), JSON.parse(fs.readFileSync('./templates/import/scopus.json').toString()));
        this.progress = -1;
        this.status_text = 'Started on ' + new Date();
        this.report = await this.reportService.createReport('Import', this.name, by_user);

        this.completeURL = this.url + `&${this.max_res_name}=${this.max_res}`;

        this.processedPublications = 0;
        this.newPublications = [];
        this.publicationsUpdate = [];
        this.numberOfPublications = 0;

        const obs$ = [];
        await firstValueFrom(this.retrieveCountRequest().pipe(map(async resp => {
            this.numberOfPublications = await this.getNumber(resp);
            this.reportService.write(this.report, { type: 'info', timestamp: new Date(), origin: this.name, text: `Starting import with ${this.completeURL} by user ${by_user}` + (dryRun ? " (simulated) " : "") })
            this.reportService.write(this.report, { type: 'info', timestamp: new Date(), origin: this.name, text: `${this.numberOfPublications} elements found` })
            if (this.numberOfPublications <= 0) {
                //finalize
                this.progress = 0;
                this.reportService.finish(this.report, {
                    status: 'Nothing to import on' + new Date(),
                    count_import: 0,
                    count_update: 0
                })
                this.status_text = 'Nothing to import on ' + new Date();
            }

            //collect observables
            if (this.mode === 'offset') {
                let offset = this.offset_start - this.max_res;
                do {
                    offset += this.max_res;
                    obs$.push(this.request(offset));
                } while (offset + this.max_res <= this.numberOfPublications);
            } else if (this.mode === 'page') {
                let page = this.offset_start - 1;
                do {
                    obs$.push(this.request(++page));
                } while (page * this.max_res < this.numberOfPublications);
            }
            return null;
        })));
        concat(scheduled(obs$, queueScheduler).pipe(delay(this.delayInMs), mergeAll(this.parallelCalls))).subscribe({
            next: async (data: any) => {
                if (!data) return;
                try {
                    const parsedData = await this.getData(data);
                    for (const [idx, pub] of parsedData.entries()) {
                        if (this.importDefinition.only_import_if_authors_inst && (!pub.authors_inst || pub.authors_inst.length == 0)) {
                            this.reportService.write(this.report, { type: 'warning', timestamp: new Date(), origin: 'mapNew', text: 'Publication without institution authors is not imported ' + this.getAuthors(pub) })
                            continue;
                        }
                        if (!this.getDOI(pub) && !this.getTitle(pub)) {
                            this.reportService.write(this.report, { type: 'warning', timestamp: new Date(), origin: 'mapNew', text: 'Publication without title or doi is not imported ' + this.getAuthors(pub) })
                            continue;
                        }
                        if (this.newPublications.find(e => e.doi && e.doi === this.getDOI(pub)) || this.publicationsUpdate.find(e => e.doi && e.doi === this.getDOI(pub))) {
                            this.reportService.write(this.report, { type: 'warning', timestamp: new Date(), origin: 'mapNew', text: 'Publication with doi ' + this.getDOI(pub) + ' has already been imported.' })
                            continue;
                        }
                        const flag = await this.publicationService.checkDOIorTitleAlreadyExists(this.getDOI(pub), this.getTitle(pub))
                        if (!flag) {
                            const pubNew = await this.mapNew(pub).catch(e => {
                                this.reportService.write(this.report, { type: 'error', publication_doi: this.getDOI(pub), publication_title: this.getTitle(pub), timestamp: new Date(), origin: 'mapNew', text: e.stack ? e.stack : e.message })
                                //console.log('Error while mapping publication ' + this.getDOI(pub) + ' with title ' + this.getTitle(pub) + ': ' + e.message + ' with stack ' + e.stack)
                            });
                            if (pubNew) {
                                this.newPublications.push(pubNew);
                                this.reportService.write(this.report, { type: 'info', publication_doi: this.getDOI(pub), publication_title: this.getTitle(pub), timestamp: new Date(), origin: 'mapNew', text: `New publication imported` })
                            } else {
                                this.reportService.write(this.report, { type: 'info', publication_doi: this.getDOI(pub), publication_title: this.getTitle(pub), timestamp: new Date(), origin: 'mapNew', text: `Nothing imported` })
                            }
                        } else if (update) {
                            const orig = await this.publicationService.getPubwithDOIorTitle(this.getDOI(pub), this.getTitle(pub));
                            if (orig.locked || orig.delete_date) continue;
                            const pubUpd = await this.mapUpdate(pub, orig).catch(e => {
                                this.reportService.write(this.report, { type: 'error', publication_id: orig.id, timestamp: new Date(), origin: 'mapUpdate', text: e.stack ? e.stack : e.message })
                                return null;
                            })
                            if (pubUpd?.pub) {
                                this.publicationsUpdate.push(pubUpd.pub);
                                this.reportService.write(this.report, { type: 'info', publication_id: orig.id, timestamp: new Date(), origin: 'mapUpdate', text: `Publication updated (${pubUpd.fields.join(',')})` })
                            }
                        }
                    }
                    // Update Progress Value
                    this.processedPublications += parsedData.length;
                } catch (e) {
                    this.numberOfPublications -= this.max_res;
                    this.reportService.write(this.report, { type: 'error', timestamp: new Date(), origin: 'import', text: `Error while processing data chunk: ${e}` })
                } finally {
                    if (this.progress !== 0) this.progress = (this.processedPublications) / this.numberOfPublications;
                    if (this.progress === 1) {
                        //finalize
                        this.progress = 0;
                        this.reportService.finish(this.report, {
                            status: 'Successfull import on ' + new Date(),
                            count_import: this.newPublications.length,
                            count_update: this.publicationsUpdate.length
                        })
                        this.status_text = 'Successfull import on ' + new Date();
                    }
                }
            }, error: async err => {
                console.log(err.message);
                if (err.response) console.log(err.response.status + ': ' + err.response.statusText)
                this.progress = 0;
                this.reportService.finish(this.report, {
                    status: 'Error while importing on ' + new Date(),
                    count_import: this.newPublications.length,
                    count_update: this.publicationsUpdate.length
                })
            }
        });
    }

    public async enrich(by_user?: string, dryRun = false) {
        if (this.progress !== 0) throw new ConflictException('The import is already running, check status for further information.');
        this.dryRun = dryRun;
        //await this.setUp(fs.readFileSync('./templates/import/crossref.jsonata').toString(), JSON.parse(fs.readFileSync('./templates/import/crossref.json').toString()));
        //await this.setUp(fs.readFileSync('./templates/import/openalex.jsonata').toString(), JSON.parse(fs.readFileSync('./templates/import/openalex.json').toString()));
        await this.setUp(fs.readFileSync('./templates/import/scopus.jsonata').toString(), JSON.parse(fs.readFileSync('./templates/import/scopus.json').toString()), {
            author_inst: UpdateOptions.APPEND,
            authors: UpdateOptions.REPLACE_IF_EMPTY,
            title: UpdateOptions.REPLACE_IF_EMPTY,
            pub_type: UpdateOptions.REPLACE_IF_EMPTY,
            oa_category: UpdateOptions.IGNORE,
            greater_entity: UpdateOptions.REPLACE_IF_EMPTY,
            publisher: UpdateOptions.REPLACE_IF_EMPTY,
            contract: UpdateOptions.IGNORE,
            funder: UpdateOptions.APPEND,
            doi: UpdateOptions.REPLACE_IF_EMPTY,
            pub_date: UpdateOptions.REPLACE_IF_EMPTY,
            link: UpdateOptions.REPLACE_IF_EMPTY,
            language: UpdateOptions.REPLACE_IF_EMPTY,
            license: UpdateOptions.REPLACE_IF_EMPTY,
            invoice: UpdateOptions.IGNORE,
            status: UpdateOptions.REPLACE_IF_EMPTY,
            abstract: UpdateOptions.REPLACE_IF_EMPTY,
            citation: UpdateOptions.IGNORE,
            page_count: UpdateOptions.REPLACE_IF_EMPTY,
            peer_reviewed: UpdateOptions.IGNORE,
            cost_approach: UpdateOptions.REPLACE_IF_EMPTY,
        }, this.enrich_whereClause);
        this.progress = -1;
        this.status_text = 'Started on ' + new Date();
        this.report = await this.reportService.createReport('Enrich', this.name, by_user);

        const publications = (await this.publicationService.get(this.enrich_whereClause)).filter(pub => this.publicationService.isDOIvalid(pub) && !pub.locked && !pub.delete_date);
        if (!publications || publications.length === 0) {
            this.progress = 0;
            this.status_text = 'Nothing to enrich on ' + new Date();
            this.reportService.write(this.report, { type: 'warning', timestamp: new Date(), origin: this.name, text: `Nothing to enrich` })
            return;
        }

        this.processedPublications = 0;
        this.newPublications = [];
        this.publicationsUpdate = [];
        this.numberOfPublications = 0;

        const obs$ = [];

        for (const pub of publications) {
            const url = this.url_doi + (await this.setVariables(this.query_doi_schema, pub.doi))
            obs$.push(this.http.get(url))
        }

        let errors = 0;
        concat(scheduled(obs$, queueScheduler).pipe(delay(this.delayInMs), mergeAll(this.parallelCalls))).subscribe({
            next: async (data: any) => {
                if (!data) {
                    errors++
                    return;
                }
                try {
                    const item = await this.getDataEnrich(data);

                    const orig = await this.publicationService.getPubwithDOIorTitle(this.getDOI(item)?.toLocaleLowerCase().trim(), this.getTitle(item)?.toLocaleLowerCase().trim())
                    if (!orig?.locked) {
                        const pubUpd = await this.mapUpdate(item, orig).catch(e => {
                            this.reportService.write(this.report, { type: 'error', publication_id: orig?.id, timestamp: new Date(), origin: 'mapUpdate', text: e.stack ? e.stack : e.message })
                            //console.log('Error while mapping update for publication ' + orig.id + ': ' + e.message)
                            return null;
                        });
                        if (pubUpd?.pub) {
                            this.publicationsUpdate.push(pubUpd.pub);
                            this.reportService.write(this.report, { type: 'info', publication_id: orig.id, timestamp: new Date(), origin: 'mapUpdate', text: `Publication updated (${pubUpd.fields.join(',')})` })
                        }
                    }
                    this.processedPublications++;
                } catch (e) {
                    this.numberOfPublications -= this.max_res;
                    this.reportService.write(this.report, { type: 'error', timestamp: new Date(), origin: 'import', text: `Error while processing data chunk: ${e}` })
                } finally {
                    if (this.progress !== 0) this.progress = (this.processedPublications + errors) / publications.length;
                    if (this.progress === 1) {
                        //finalize
                        this.progress = 0;
                        this.reportService.finish(this.report, {
                            status: 'Successfull enrich on ' + new Date(),
                            count_import: 0,
                            count_update: this.publicationsUpdate.length
                        })
                        this.status_text = 'Successfull enrich on ' + new Date();
                    }
                }
            }, error: async err => {
                console.log(err.message);
                if (err.response) console.log(err.response.status + ': ' + err.response.statusText)
                this.progress = 0;
                this.reportService.finish(this.report, {
                    status: 'Error while importing on ' + new Date(),
                    count_import: this.newPublications.length,
                    count_update: this.publicationsUpdate.length
                })
            }
        });
    }

    protected retrieveCountRequest() {
        return this.request(this.offset_count);
    }
    protected request(offset: number): Observable<any> {
        const url = this.completeURL + `&${this.offset_name}=` + offset;
        return this.http.get(url);
    }

    protected async getNumber(response: any): Promise<number> {
        const mapping = jsonata(this.importDefinition.get_count)
        return mapping.evaluate(response.data)
    }
    protected async importTest(element: any): Promise<boolean> {
        const mapping = jsonata(this.importDefinition.exclusion_criteria)
        const obj = await mapping.evaluate(element)
        return !obj;
    }

    protected getDOI(element: JSONataParsedObject): string {
        return element.doi;
    }
    protected getTitle(element: JSONataParsedObject): string {
        return element.title;
    }
    protected getInstAuthors(element: JSONataParsedObject): { first_name: string; last_name: string; orcid?: string; affiliation?: string; }[] {
        return element.authors_inst;
    }
    protected getAuthors(element: JSONataParsedObject): string {
        return element.authors;
    }
    protected getGreaterEntity(element: JSONataParsedObject): GreaterEntity {
        return element.greater_entity;
    }
    protected getPublisher(element: JSONataParsedObject): Publisher {
        return element.publisher;
    }
    protected getPubDate(element: JSONataParsedObject): Date | { pub_date?: Date, pub_date_print?: Date, pub_date_accepted?: Date, pub_date_submitted?: Date } {
        return {
            pub_date: element.pub_date ? (element.pub_date instanceof Date ? element.pub_date : new Date(element.pub_date)) : undefined,
            pub_date_print: element.pub_date_print ? (element.pub_date_print instanceof Date ? element.pub_date_print : new Date(element.pub_date_print)) : undefined,
            pub_date_accepted: element.pub_date_accepted ? (element.pub_date_accepted instanceof Date ? element.pub_date_accepted : new Date(element.pub_date_accepted)) : undefined,
            pub_date_submitted: element.pub_date_submitted ? (element.pub_date_submitted instanceof Date ? element.pub_date_submitted : new Date(element.pub_date_submitted)) : undefined,
        }
    }
    protected getLink(element: JSONataParsedObject): string {
        return element.link;
    }
    protected getLanguage(element: JSONataParsedObject): string {
        return element.language;
    }
    protected getFunder(element: JSONataParsedObject): Funder[] {
        return element.funder;
    }
    protected getPubType(element: JSONataParsedObject): string {
        return element.pub_type;
    }
    protected getOACategory(element: JSONataParsedObject): string {
        return element.oa_category;
    }
    protected getContract(element: JSONataParsedObject): string {
        return element.contract;
    }
    protected getLicense(element: JSONataParsedObject): string {
        return element.license;
    }
    protected getInvoiceInformation(element: JSONataParsedObject) {
        return element.invoices;
    }
    protected getStatus(element: JSONataParsedObject): number {
        return element.status;
    }
    protected getAbstract(element: JSONataParsedObject): string {
        return element.abstract;
    }
    protected getCitation(element: JSONataParsedObject): { volume?: string, issue?: string, first_page?: string, last_page?: string, publisher_location?: string, edition?: string, article_number?: string } {
        return {
            volume: element.volume,
            issue: element.issue,
            first_page: element.first_page,
            last_page: element.last_page,
            publisher_location: element.publisher_location,
            edition: element.edition,
            article_number: element.article_number,
        };
    }
    protected getPageCount(element: JSONataParsedObject): number {
        return element.page_count;
    }
    protected getPeerReviewed(element: JSONataParsedObject): boolean {
        return element.peer_reviewed;
    }
    protected getCostApproach(element: JSONataParsedObject): number {
        return element.cost_approach;

    }
}