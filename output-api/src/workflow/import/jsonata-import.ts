import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, InternalServerErrorException, NotImplementedException } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import jsonata from 'jsonata';
import * as Papa from 'papaparse';
import { concat, concatMap, firstValueFrom, map, mergeAll, Observable, queueScheduler, scheduled, timer } from 'rxjs';
import { DeepPartial, FindManyOptions, IsNull, Not } from 'typeorm';
import * as XLSX from 'xlsx';
import * as xmljs from 'xml-js';
import { UpdateMapping, UpdateOptions } from '../../../../output-interfaces/Config';
import { ImportWorkflow, ImportWorkflowTestResult, ImportStrategy, WorkflowReportItemLevel } from '../../../../output-interfaces/Workflow';
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
import { AbstractImportService } from './abstract-import';
import { WorkflowReportService } from '../workflow-report.service';

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
    cost_approach_currency?: string;
    volume: string;
    issue: string;
    first_page: string,
    last_page: string,
    publisher_location: string,
    edition: string,
    article_number: string,
}

type RequestMode = 'offset' | 'page';

@Injectable()
export class JSONataImportService extends AbstractImportService {

    constructor(protected publicationService: PublicationService, protected authorService: AuthorService,
        protected geService: GreaterEntityService, protected funderService: FunderService, protected publicationTypeService: PublicationTypeService,
        protected publisherService: PublisherService, protected oaService: OACategoryService, protected contractService: ContractService,
        protected invoiceService: InvoiceService, protected reportService: ReportItemService, protected instService: InstituteService,
        protected languageService: LanguageService, protected roleService: RoleService, protected configService: AppConfigService, protected workflowReportService: WorkflowReportService, protected http: HttpService) {
        super(publicationService, authorService, geService, funderService, publicationTypeService, publisherService, oaService, contractService, reportService, instService, languageService, roleService, invoiceService, configService, workflowReportService);
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
    protected url_count = this.url;
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
    private lookupURL = '';
    private retrieveURL = '';
    private lookupFormat = 'json';
    private retrieveFormat = 'json';

    protected importDefinition: ImportWorkflow;
    protected reporting_year;
    protected query_doi_schema;
    protected get_doi_item;
    public enrich_whereClause;
    protected url_doi;
    private file: Express.Multer.File;

    private config;

    public async setUp(importDefinition: ImportWorkflow, updateMapping?: UpdateMapping, enrich_whereClause?: FindManyOptions) {
        this.importDefinition = importDefinition;
        this.enrich_whereClause = enrich_whereClause;

        this.importConfig = importDefinition.mapping;
        this.url = this.importDefinition.strategy.url_items;
        this.url_count = this.importDefinition.strategy.url_count;
        this.max_res = this.importDefinition.strategy.max_res;
        this.max_res_name = this.importDefinition.strategy.max_res_name;
        this.mode = this.importDefinition.strategy.request_mode;
        this.offset_name = this.importDefinition.strategy.offset_name;
        this.offset_count = this.importDefinition.strategy.offset_count;
        this.offset_start = this.importDefinition.strategy.offset_start;
        this.parallelCalls = this.importDefinition.strategy.parallelCalls;
        this.search_text_combiner = this.importDefinition.strategy.search_text_combiner
        this.get_doi_item = this.importDefinition.strategy.get_doi_item;
        this.url_doi = this.importDefinition.strategy.url_doi;
        this.delayInMs = this.importDefinition.strategy.delayInMs;
        this.lookupURL = this.importDefinition.strategy.url_lookup;
        this.retrieveURL = this.importDefinition.strategy.url_retrieve;
        this.lookupFormat = this.importDefinition.strategy.lookup_format ?? this.importDefinition.strategy.format ?? 'json';
        this.retrieveFormat = this.importDefinition.strategy.retrieve_format ?? this.importDefinition.strategy.format ?? 'json';

        if (updateMapping) this.updateMapping = updateMapping;
        this.config = {};
        (await this.configService.listDatabaseConfig('admin')).map(e => {
            this.config[e.key] = e.value;
        });
        (await this.configService.listEnvConfig()).map(e => {
            this.config[e.key] = e.value;
        });
        this.searchText = '';
        if (this.search_text_combiner) await this.config['search_tags'].forEach(tag => {
            this.searchText += tag + this.search_text_combiner;
        });
        if (this.searchText && this.search_text_combiner) this.searchText = this.searchText.slice(0, this.searchText.length - this.search_text_combiner.length)

        this.affiliationText = '';
        if (this.search_text_combiner) await this.config['affiliation_tags'].forEach(tag => {
            this.affiliationText += tag + this.search_text_combiner;
        });
        if (this.affiliationText) this.affiliationText = this.affiliationText.slice(0, this.affiliationText.length - this.search_text_combiner.length)

        //process query string
        this.url = await this.setVariables(this.url);
        this.url_count = await this.setVariables(this.url_count);
        this.lookupURL = await this.setVariables(this.lookupURL);

        this.name = this.importDefinition.label + '_v' + this.importDefinition.version;

        this.workflowReport = await this.workflowReportService.createReport({
            status: 'initialized',
            progress: 0,
            workflow: this.importDefinition,
            params: {
                reporting_year: this.reporting_year ?? undefined,
                search_text: this.searchText ? this.searchText : undefined,
                affiliation_text: this.affiliationText ? this.affiliationText : undefined,
                url: await this.setVariables(this.url, undefined, true) ?? undefined,
                url_count: await this.setVariables(this.url_count, undefined, true) ?? undefined,
                url_lookup: await this.setVariables(this.lookupURL, undefined, true) ?? undefined,
                url_retrieve: await this.setVariables(this.retrieveURL, undefined, true) ?? undefined,
                url_doi: await this.setVariables(this.url_doi, undefined, true) ?? undefined,
                enrich_whereClause: this.enrich_whereClause ?? undefined,
            }
        })
    }

    async setVariables(queryString: string, doi?: string, safe = false, id?: string | number): Promise<string> {
        if (!queryString) return null;
        let result = queryString;
        const regex = /(?<!\\)\[([^\]]+)\]/g
        const keys = [...result.matchAll(regex)].map(m => m[1]);
        const values = await Promise.all(keys.map(k => this.configService.get(k)));
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            let value;
            if (key === 'year') value = this.reporting_year;
            else if (key === 'search_tags') value = this.searchText;
            else if (key === 'doi') value = doi;
            else if (key === 'id' || key === 'lookup_id') value = id;
            else if (key === 'affiliation_tags') value = this.affiliationText;
            else if (safe && key.includes('SECRET')) value = key
            else value = values[i] ?? ""; // oder Fehler werfen

            if (value) result = result.replace(`[${key}]`, value);
            else if (!safe) throw new BadRequestException(`value for ${key} is not available`);
        }
        return result.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
    }

    protected parseResponseData(response: AxiosResponse, format = this.importDefinition.strategy.format) {
        let data = response.data;
        if (format === 'xml') {
            data = JSON.parse(xmljs.xml2json(data, { compact: true }));
        }
        return data;
    }

    protected async getData(response: AxiosResponse): Promise<JSONataParsedObject[]> {
        try {
            const data = this.parseResponseData(response);

            const mapping = jsonata(this.importDefinition.strategy.get_items)
            const items = (await mapping.evaluate(data))
            return await Promise.all(items.map(e => this.transform(e)))
        } catch (err) {
            console.log(err)
            return null;
        }
    }

    protected async getDataEnrich(response: AxiosResponse): Promise<JSONataParsedObject> {
        try {
            const data = this.parseResponseData(response);
            const mapping = jsonata(this.importDefinition.strategy.get_doi_item)
            const item = (await mapping.evaluate(data))
            return await this.transform(item)
        } catch (err) {
            console.log(err)
            return null;
        }
    }

    protected async getLookupIds(response: AxiosResponse): Promise<(string | number)[]> {
        try {
            const data = this.parseResponseData(response, this.lookupFormat);
            const mapping = jsonata(this.importDefinition.strategy.get_lookup_ids)
            const ids = await mapping.evaluate(data);
            if (!ids) return [];
            return Array.isArray(ids) ? ids : [ids];
        } catch (err) {
            console.log(err)
            return [];
        }
    }

    protected async getDataRetrieve(response: AxiosResponse): Promise<JSONataParsedObject> {
        try {
            const data = this.parseResponseData(response, this.retrieveFormat);
            const mapping = jsonata(this.importDefinition.strategy.get_retrieve_item)
            const item = await mapping.evaluate(data);
            return await this.transform(item)
        } catch (err) {
            console.log(err)
            return null;
        }
    }

    public async setReportingYear(year: string) {
        this.reporting_year = year;
    }

    async transform(element: AxiosResponse): Promise<JSONataParsedObject> {
        const mapping = jsonata(this.importConfig)
        const obj = (await mapping.evaluate({ ...element, params: { cfg: this.config } }))
        return obj;
    }

    protected async collectLookupIds(): Promise<(string | number)[]> {
        const ids: (string | number)[] = [];
        const seenIds = new Set<string>();
        let cursor = this.offset_start;
        let count: number | undefined;

        while (count === undefined || ids.length < count) {
            const response = await firstValueFrom(this.retrieveLookupRequest(cursor));
            if (count === undefined) count = await this.getNumber(response, this.lookupFormat);

            const retrievedIds = await this.getLookupIds(response);
            if (!retrievedIds || retrievedIds.length === 0) break;

            for (const id of retrievedIds) {
                if (id === undefined || id === null || id === '') continue;
                const key = `${id}`;
                if (seenIds.has(key)) continue;
                seenIds.add(key);
                ids.push(id);
            }

            if (ids.length >= count || retrievedIds.length < this.max_res) break;

            if (this.mode === 'offset') cursor += this.max_res;
            else cursor += 1;
        }

        return count !== undefined ? ids.slice(0, count) : ids;
    }

    protected async processImportItem(pub: JSONataParsedObject, update: boolean) {
        if (this.importDefinition.strategy.only_import_if_authors_inst && (!pub.authors_inst || pub.authors_inst.length == 0)) {
            await this.workflowReportService.write(this.workflowReport.id, {
                level: WorkflowReportItemLevel.WARNING,
                timestamp: new Date(),
                message: 'Publication without institution authors is not imported ' + `title ${this.getTitle(pub)} and doi ${this.getDOI(pub)}`
            });
            return;
        }
        if (!this.getDOI(pub) && !this.getTitle(pub)) {
            await this.workflowReportService.write(this.workflowReport.id, {
                level: WorkflowReportItemLevel.WARNING,
                timestamp: new Date(),
                message: 'Publication without title or doi is not imported ' + `title ${this.getTitle(pub)} and doi ${this.getDOI(pub)}`
            });
            return;
        }
        if (this.newPublications.find(e => e.doi && e.doi === this.getDOI(pub)) || this.publicationsUpdate.find(e => e.doi && e.doi === this.getDOI(pub))) {
            await this.workflowReportService.write(this.workflowReport.id, {
                level: WorkflowReportItemLevel.WARNING,
                timestamp: new Date(),
                message: 'Publication with doi ' + this.getDOI(pub) + ' has already been imported.'
            });
            return;
        }

        const flag = await this.publicationService.checkDOIorTitleAlreadyExists(this.getDOI(pub), this.getTitle(pub))
        if (!flag) {
            const pubNew = await this.mapNew(pub).catch(async e => {
                await this.workflowReportService.write(this.workflowReport.id, {
                    level: WorkflowReportItemLevel.ERROR,
                    timestamp: new Date(),
                    message: `Error importing publication with title ${this.getTitle(pub)} and doi ${this.getDOI(pub)}: ${e.stack ? e.stack : e.message}`
                });
                return null;
            });
            if (pubNew) {
                this.newPublications.push(pubNew);
                await this.workflowReportService.write(this.workflowReport.id, {
                    level: WorkflowReportItemLevel.INFO,
                    timestamp: new Date(),
                    message: `New publication imported with title ${this.getTitle(pub)} and doi ${this.getDOI(pub)}`
                });
            } else {
                await this.workflowReportService.write(this.workflowReport.id, {
                    level: WorkflowReportItemLevel.INFO,
                    timestamp: new Date(),
                    message: `Nothing imported for title ${this.getTitle(pub)} and doi ${this.getDOI(pub)}`
                });
            }
            return;
        }

        if (!update) return;

        const orig = await this.publicationService.getPubwithDOIorTitle(this.getDOI(pub), this.getTitle(pub));
        if (orig.locked || orig.delete_date) return;
        const pubUpd = await this.mapUpdate(pub, orig).catch(async e => {
            await this.workflowReportService.write(this.workflowReport.id, {
                level: WorkflowReportItemLevel.ERROR,
                timestamp: new Date(),
                message: `Error updating publication ${orig.id}: ${e.stack ? e.stack : e.message}`
            });
            return null;
        });
        if (pubUpd?.pub) {
            this.publicationsUpdate.push(pubUpd.pub);
            await this.workflowReportService.write(this.workflowReport.id, {
                level: WorkflowReportItemLevel.INFO,
                timestamp: new Date(),
                message: `Publication ${orig.id} updated (${pubUpd.fields.join(',')})`
            });
        }
    }

    public async test(pos: number = 1): Promise<ImportWorkflowTestResult> {
        this.workflowReport = await this.workflowReportService.save({
            id: this.workflowReport.id,
            status: 'test_run started',
            started_at: new Date(),
            dry_run: true
        })
        const start = new Date();
        const result: DeepPartial<ImportWorkflowTestResult> = {
            meta: {
                workflow_id: this.importDefinition.workflow_id,
                strategy_type: this.importDefinition.strategy_type,
                strategy: this.importDefinition.strategy,
                pos,
                timestamp: start
            },
            read: {
                read_items: [],
            },
            result: {
                excluded: [],
                imported: [],
                issues: [],
                update_fields: []
            }
        };
        this.dryRun = true;
        let ob$: Observable<unknown>;
        let resp_count;
        let count = 0;
        let resp;
        let pub: Publication;
        let item;
        let pubUpd;
        let orig;
        switch (this.importDefinition.strategy_type) {
            case ImportStrategy.URL_DOI:
                try {
                    pub = (await this.publicationService.get({ where: { doi: Not(IsNull()) }, take: 1, skip: pos }))[0]
                } catch (err) {
                    result.result.issues.push({
                        message: 'Could not find any publication with DOI', error: err instanceof Error
                            ? {
                                name: err.name,
                                message: err.message,
                                stack: err.stack,
                            }
                            : err
                    })
                }

                result.read.source = await this.setVariables(this.url_doi, pub.doi, true);
                ob$ = this.http.get(await this.setVariables(this.url_doi, pub.doi, false))
                try {
                    resp = await firstValueFrom(ob$) as AxiosResponse;
                    result.read.response = this.collectKeys(resp.data)
                } catch (err) {
                    result.result.issues.push({
                        message: 'Could not retrieve response from URL', error: err instanceof Error
                            ? {
                                name: err.name,
                                message: err.message,
                                stack: err.stack,
                            }
                            : err
                    })
                }

                try {
                    item = await this.getDataEnrich(resp);
                    result.read.read_items = item;
                } catch (err) {
                    result.result.issues.push({
                        message: 'Could not retrieve item from response', error: err instanceof Error
                            ? {
                                name: err.name,
                                message: err.message,
                                stack: err.stack,
                            }
                            : err
                    })
                }
                try {
                    orig = await this.publicationService.getPubwithDOIorTitle(this.getDOI(item)?.toLocaleLowerCase().trim(), this.getTitle(item)?.toLocaleLowerCase().trim())
                } catch (err) {
                    result.result.issues.push({
                        message: 'Could not retrieve original via DOI or title', error: err instanceof Error
                            ? {
                                name: err.name,
                                message: err.message,
                                stack: err.stack,
                            }
                            : err
                    })
                }
                if (orig && !orig?.locked) {
                    try {
                        pubUpd = await this.mapUpdate(item, orig)
                    } catch (err) {
                        result.result.issues.push({
                            message: 'Could not map item', error: err instanceof Error
                                ? {
                                    name: err.name,
                                    message: err.message,
                                    stack: err.stack,
                                }
                                : err
                        })
                    }
                    if (pubUpd?.pub) {
                        result.result.imported.push(pubUpd.pub);
                        result.result.update_fields.push(pubUpd.fields);
                    }
                }

                break;
            case ImportStrategy.URL_LOOKUP_AND_RETRIEVE: {
                let ids: (string | number)[] = [];

                result.read.source = await this.setVariables(this.lookupURL, undefined, true);
                try {
                    ids = await this.collectLookupIds();
                    count = ids.length;
                    result.read.count = count;
                } catch (err) {
                    result.result.issues.push({
                        message: 'Error retrieving lookup ids', error: err instanceof Error
                            ? {
                                name: err.name,
                                message: err.message,
                                stack: err.stack,
                            }
                            : err
                    })
                }

                if (pos > count) result.result.issues.push({ message: 'Position greater than count', error: null })

                try {
                    const id = ids[pos > 0 ? pos - 1 : 0];
                    ob$ = this.http.get(await this.setVariables(this.retrieveURL, undefined, false, id));
                    resp = await firstValueFrom(ob$);
                    result.read.response = this.collectKeys(resp.data)
                } catch (err) {
                    result.result.issues.push({
                        message: 'Error while retrieving item with lookup/retrieve strategy', error: err instanceof Error
                            ? {
                                name: err.name,
                                message: err.message,
                                stack: err.stack,
                            }
                            : err
                    })
                }

                try {
                    item = await this.getDataRetrieve(resp);
                    result.read.read_items = item;
                    const pubNew = await this.mapNew(item)
                    if (pubNew) result.result.imported.push(pubNew);
                    else result.result.excluded.push(item);
                } catch (err) {
                    result.result.issues.push({
                        message: 'Error while converting retrieved item with mapping', error: err instanceof Error
                            ? {
                                name: err.name,
                                message: err.message,
                                stack: err.stack,
                            }
                            : err
                    })
                }
                break;
            }
            case ImportStrategy.URL_QUERY_OFFSET:
            default:
                this.completeURL = this.url + `&${this.max_res_name}=${this.max_res}`;

                result.read.source = await this.setVariables(this.url_count, undefined, true);
                try {
                    resp_count = await firstValueFrom(this.retrieveCountRequest())
                } catch (err) {
                    result.result.issues.push({
                        message: 'Error retrieving count with ' + this.completeURL, error: err instanceof Error
                            ? {
                                name: err.name,
                                message: err.message,
                                stack: err.stack,
                            }
                            : err
                    })
                }

                try {
                    count = await this.getNumber(resp_count);
                    result.read.count = count;
                } catch (err) {
                    result.result.issues.push({
                        message: 'Error retrieving count from response', error: err instanceof Error
                            ? {
                                name: err.name,
                                message: err.message,
                                stack: err.stack,
                            }
                            : err
                    })
                }

                if (pos > count) result.result.issues.push({ message: 'Position greater than count', error: null })

                if (this.mode === 'offset') {
                    ob$ = this.request(this.offset_start + pos - 1);
                } else if (this.mode === 'page') {
                    const page = this.offset_start + Math.floor(pos / this.max_res)
                    ob$ = this.request(page);
                }

                try {
                    resp = await firstValueFrom(ob$);
                    result.read.response = this.collectKeys(resp.data)
                } catch (err) {
                    result.result.issues.push({
                        message: 'Error while retrieving items with ' + this.completeURL, error: err instanceof Error
                            ? {
                                name: err.name,
                                message: err.message,
                                stack: err.stack,
                            }
                            : err
                    })
                }

                try {
                    const parsedData = await this.getData(resp);
                    result.read.read_items = parsedData;
                    for (const chunk of parsedData) {
                        const pubNew = await this.mapNew(chunk)
                        if (pubNew) result.result.imported.push(pubNew);
                        else result.result.excluded.push(chunk);
                    }
                } catch (err) {
                    result.result.issues.push({
                        message: 'Error while converting data with mapping', error: err instanceof Error
                            ? {
                                name: err.name,
                                message: err.message,
                                stack: err.stack,
                            }
                            : err
                    })
                }
        }
        const now = new Date()
        result.meta.durationMs = now.getTime() - start.getTime()
        if (result.result.issues.length === 0) result.result.status = 'ok';
        else result.result.status = 'error';
        return result as ImportWorkflowTestResult;
    }

    public async loadFile(update: boolean, file: Express.Multer.File, by_user?: string, dryRun = false) {
        this.dryRun = dryRun;
        await this.startWorkflowRun(by_user, dryRun, {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...this.workflowReport.params as any,
            file_name: file.originalname
        });

        this.file = file;

        this.processedPublications = 0;
        this.newPublications = [];
        this.publicationsUpdate = [];
        this.numberOfPublications = 0;

        let jsonData;
        if (this.importDefinition.strategy.format === 'xlsx') {
            const workbook = XLSX.read(this.file.buffer, { type: 'buffer' })
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            jsonData = XLSX.utils.sheet_to_json(worksheet);
        } else if (this.importDefinition.strategy.format === 'csv') {
            await Papa.parse(this.file.buffer.toString(), {
                encoding: this.importDefinition.strategy.encoding,
                header: this.importDefinition.strategy.skip_first_line,
                quoteChar: this.importDefinition.strategy.quote_char,
                delimiter: this.importDefinition.strategy.delimiter,
                skipEmptyLines: true,
                complete: async (result, _file) => {
                    jsonData = result.data;
                }
            });
        } else throw new NotImplementedException();
        let data = [];
        try {
            data = await Promise.all(jsonData.map(e => this.transform(e)))
        } catch (err) {
            throw new InternalServerErrorException(err, "JSONata mapping could not be applied")
        }
        this.numberOfPublications = data.length;
        this.workflowReportService.write(this.workflowReport.id, { level: WorkflowReportItemLevel.INFO, timestamp: new Date(), message: `${this.numberOfPublications} elements found` })

        try {
            if (!data) return;
            for (const pub of data) {
                const flag = await this.publicationService.checkDOIorTitleAlreadyExists(this.getDOI(pub), this.getTitle(pub))
                if (!flag) {
                    const pubNew = await this.mapNew(pub).catch(e =>
                        this.workflowReportService.write(this.workflowReport.id, { level: WorkflowReportItemLevel.ERROR, timestamp: new Date(), message: `Error importing publication with title ${this.getTitle(pub)} and doi ${this.getDOI(pub)}` }));
                    if (pubNew) {
                        this.newPublications.push(pubNew);
                        this.workflowReportService.write(this.workflowReport.id, { level: WorkflowReportItemLevel.INFO, timestamp: new Date(), message: `New publication imported with title ${this.getTitle(pub)} and doi ${this.getDOI(pub)}` })
                    }
                } else if (update) {
                    const orig = await this.publicationService.getPubwithDOIorTitle(this.getDOI(pub), this.getTitle(pub));
                    if (orig.locked) continue;
                    const pubUpd = await this.mapUpdate(pub, orig).catch(e => {
                        this.workflowReportService.write(this.workflowReport.id, { level: WorkflowReportItemLevel.ERROR, timestamp: new Date(), message: `Error updating publication with title ${this.getTitle(pub)} and doi ${this.getDOI(pub)}` })
                        return null;
                    })
                    if (pubUpd?.pub) {
                        this.publicationsUpdate.push(pubUpd.pub);
                        this.workflowReportService.write(this.workflowReport.id, { level: WorkflowReportItemLevel.INFO, timestamp: new Date(), message: `Publication updated (${pubUpd.fields.join(',')})` })
                    }
                }
                // Update Progress Value
                this.processedPublications++;
                if (this.progress !== 0) {
                    await this.updateRuntimeStatus((this.processedPublications) / this.numberOfPublications);
                }
            }
            //finalize
            await this.finishWorkflowRun('Successfull import', 'Successfull import on ' + new Date(), {
                count_import: this.newPublications.length,
                count_update: this.publicationsUpdate.length
            });

        } catch (err) {
            this.status_text = 'Error while importing on ' + new Date();
            console.log(err.stack);
            await this.finishWorkflowRun('Error while importing', this.status_text, {
                count_import: this.newPublications.length,
                count_update: this.publicationsUpdate.length
            });
        }
    }


    /**
     * main method for import and updates, retrieves elements from CSV file and saves the mapped entities to the DB
     */
    public async importLookupAndRetrieve(update: boolean, by_user?: string, dryRun = false) {
        if (!this.lookupURL || !this.retrieveURL || !this.max_res_name || !this.max_res || !this.offset_name || this.offset_start == undefined || !this.importDefinition.strategy.get_count || !this.importDefinition.strategy.get_lookup_ids || !this.importDefinition.strategy.get_retrieve_item) {
            throw new BadRequestException('Import cannot be run due to missing parameters.')
        }

        this.dryRun = dryRun;
        await this.startWorkflowRun(by_user, dryRun);

        this.processedPublications = 0;
        this.newPublications = [];
        this.publicationsUpdate = [];
        this.numberOfPublications = 0;

        const ids = await this.collectLookupIds();
        this.numberOfPublications = ids.length;
        await this.workflowReportService.write(this.workflowReport.id, {
            level: WorkflowReportItemLevel.INFO,
            timestamp: new Date(),
            message: `${this.numberOfPublications} elements found`
        });

        if (this.numberOfPublications <= 0) {
            await this.finishWorkflowRun('Nothing to import', 'Nothing to import on ' + new Date(), {
                count_import: 0,
                count_update: 0
            });
            return;
        }

        const obs$ = [];
        for (const id of ids) {
            const url = await this.setVariables(this.retrieveURL, undefined, false, id);
            obs$.push(this.delayedGet(url));
        }

        concat(scheduled(obs$, queueScheduler).pipe(mergeAll(this.parallelCalls))).subscribe({
            next: async (data: AxiosResponse) => {
                if (!data) return;
                try {
                    const parsedData = await this.getDataRetrieve(data);
                    await this.processImportItem(parsedData, update);
                    this.processedPublications++;
                } catch (e) {
                    this.numberOfPublications--;
                    await this.workflowReportService.write(this.workflowReport.id, {
                        level: WorkflowReportItemLevel.ERROR,
                        timestamp: new Date(),
                        message: `Error while processing data chunk: ${e}`
                    });
                } finally {
                    if (this.progress !== 0) {
                        await this.updateRuntimeStatus((this.processedPublications) / this.numberOfPublications);
                    }
                    if (this.progress === 1) {
                        await this.finishWorkflowRun('Successfull import', 'Successfull import on ' + new Date(), {
                            count_import: this.newPublications.length,
                            count_update: this.publicationsUpdate.length
                        });
                    }
                }
            }, error: async err => {
                console.log(err.message);
                if (err.response) console.log(err.response.status + ': ' + err.response.statusText)
                await this.finishWorkflowRun('Error while importing', 'Error while importing on ' + new Date(), {
                    count_import: this.newPublications.length,
                    count_update: this.publicationsUpdate.length
                });
            }
        });
    }

    public async import(update: boolean, by_user?: string, dryRun = false) {
        this.dryRun = dryRun;
        if (!this.url || !this.max_res_name || !this.max_res || !this.url_count || this.offset_count == undefined || !this.offset_name || this.offset_start == undefined || !this.importDefinition.strategy.get_count || !this.importDefinition.strategy.get_items)
            throw new BadRequestException('Import cannot be run due to missing parameters.')
        await this.startWorkflowRun(by_user, dryRun);

        this.completeURL = this.url + `&${this.max_res_name}=${this.max_res}`;

        this.processedPublications = 0;
        this.newPublications = [];
        this.publicationsUpdate = [];
        this.numberOfPublications = 0;

        const obs$ = [];
        await firstValueFrom(this.retrieveCountRequest().pipe(map(async resp => {
            this.numberOfPublications = await this.getNumber(resp);
            await this.workflowReportService.write(this.workflowReport.id, {
                level: WorkflowReportItemLevel.INFO,
                timestamp: new Date(),
                message: `${this.numberOfPublications} elements found`
            });
            if (this.numberOfPublications <= 0) {
                //finalize
                await this.finishWorkflowRun('Nothing to import', 'Nothing to import on ' + new Date(), {
                    count_import: 0,
                    count_update: 0
                });
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
        concat(scheduled(obs$, queueScheduler).pipe(mergeAll(this.parallelCalls))).subscribe({
            next: async (data: AxiosResponse) => {
                if (!data) return;
                try {
                    const parsedData = await this.getData(data);
                    for (const pub of parsedData.values()) {
                        await this.processImportItem(pub, update);
                    }
                    // Update Progress Value
                    this.processedPublications += parsedData.length;
                } catch (e) {
                    this.numberOfPublications -= this.max_res;
                    await this.workflowReportService.write(this.workflowReport.id, {
                        level: WorkflowReportItemLevel.ERROR,
                        timestamp: new Date(),
                        message: `Error while processing data chunk: ${e}`
                    });
                } finally {
                    if (this.progress !== 0) {
                        await this.updateRuntimeStatus((this.processedPublications) / this.numberOfPublications);
                    }
                    if (this.progress === 1) {
                        //finalize
                        await this.finishWorkflowRun('Successfull import', 'Successfull import on ' + new Date(), {
                            count_import: this.newPublications.length,
                            count_update: this.publicationsUpdate.length
                        });
                    }
                }
            }, error: async err => {
                console.log(err.message);
                if (err.response) console.log(err.response.status + ': ' + err.response.statusText)
                await this.finishWorkflowRun('Error while importing', 'Error while importing on ' + new Date(), {
                    count_import: this.newPublications.length,
                    count_update: this.publicationsUpdate.length
                });
            }
        });
    }

    public async enrich(by_user?: string, dryRun = false) {
        this.dryRun = dryRun;
        if (!this.url_doi || !this.importDefinition.strategy.get_doi_item)
            throw new BadRequestException('Enrich cannot be run due to missing parameters.')
        await this.startWorkflowRun(by_user, dryRun);

        const publications = (await this.publicationService.get(this.enrich_whereClause)).filter(pub => this.publicationService.isDOIvalid(pub) && !pub.locked && !pub.delete_date);
        if (!publications || publications.length === 0) {
            await this.finishWorkflowRun('Nothing to enrich', 'Nothing to enrich on ' + new Date(), {
                count_import: 0,
                count_update: 0
            });
            return;
        }

        this.processedPublications = 0;
        this.newPublications = [];
        this.publicationsUpdate = [];
        this.numberOfPublications = 0;

        const obs$ = [];

        for (const pub of publications) {
            const url = await this.setVariables(this.url_doi, pub.doi);
            obs$.push(this.delayedGet(url))
        }

        let errors = 0;
        concat(scheduled(obs$, queueScheduler).pipe(mergeAll(this.parallelCalls))).subscribe({
            next: async (data: AxiosResponse) => {
                if (!data) {
                    errors++
                    return;
                }
                try {
                    const item = await this.getDataEnrich(data);

                    const orig = await this.publicationService.getPubwithDOIorTitle(this.getDOI(item)?.toLocaleLowerCase().trim(), this.getTitle(item)?.toLocaleLowerCase().trim())
                    if (!orig?.locked) {
                        const pubUpd = await this.mapUpdate(item, orig).catch(async e => {
                            await this.workflowReportService.write(this.workflowReport.id, {
                                level: WorkflowReportItemLevel.ERROR,
                                timestamp: new Date(),
                                message: `Error updating publication ${orig?.id}: ${e.stack ? e.stack : e.message}`
                            });
                            //console.log('Error while mapping update for publication ' + orig.id + ': ' + e.message)
                            return null;
                        });
                        if (pubUpd?.pub) {
                            this.publicationsUpdate.push(pubUpd.pub);
                            await this.workflowReportService.write(this.workflowReport.id, {
                                level: WorkflowReportItemLevel.INFO,
                                timestamp: new Date(),
                                message: `Publication ${orig.id} updated (${pubUpd.fields.join(',')})`
                            });
                        }
                    }
                    this.processedPublications++;
                } catch (e) {
                    this.numberOfPublications -= this.max_res;
                    await this.workflowReportService.write(this.workflowReport.id, {
                        level: WorkflowReportItemLevel.ERROR,
                        timestamp: new Date(),
                        message: `Error while processing data chunk: ${e}`
                    });
                } finally {
                    if (this.progress !== 0) {
                        await this.updateRuntimeStatus((this.processedPublications + errors) / publications.length);
                    }
                    if (this.progress === 1) {
                        //finalize
                        await this.finishWorkflowRun('Successfull enrich', 'Successfull enrich on ' + new Date(), {
                            count_import: 0,
                            count_update: this.publicationsUpdate.length
                        });
                    }
                }
            }, error: async err => {
                console.log(err.message);
                if (err.response) console.log(err.response.status + ': ' + err.response.statusText)
                await this.finishWorkflowRun('Error while enriching', 'Error while enriching on ' + new Date(), {
                    count_import: this.newPublications.length,
                    count_update: this.publicationsUpdate.length
                });
            }
        });
    }

    protected retrieveCountRequest(): Observable<AxiosResponse> {
        const url = this.url_count + `&${this.offset_name}=` + this.offset_count;
        return this.http.get(url);
    }
    protected delayedGet(url: string): Observable<AxiosResponse> {
        return timer(this.delayInMs).pipe(concatMap(() => this.http.get(url)));
    }
    protected retrieveLookupRequest(offset: number): Observable<AxiosResponse> {
        const url = this.lookupURL + `&${this.max_res_name}=${this.max_res}&${this.offset_name}=` + offset;
        return this.delayedGet(url);
    }
    protected request(offset: number): Observable<AxiosResponse> {
        const url = this.completeURL + `&${this.offset_name}=` + offset;
        return this.delayedGet(url);
    }

    protected async getNumber(response: AxiosResponse, format = this.importDefinition.strategy.format): Promise<number> {
        const data = this.parseResponseData(response, format);
        const mapping = jsonata(this.importDefinition.strategy.get_count)
        return mapping.evaluate(data)
    }
    protected async importTest(element: AxiosResponse): Promise<boolean> {
        const mapping = jsonata(this.importDefinition.strategy.exclusion_criteria)
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
    protected getOACategory(element: JSONataParsedObject): { oa_category?: string, is_oa?: string, oa_status?: string, is_journal_oa?: string, best_oa_host?: string } {
        return {
            oa_category: element.oa_category,
            is_oa: element["is_oa"],
            oa_status: element["oa_status"],
            is_journal_oa: element["is_journal_oa"],
            best_oa_host: element["best_oa_host"],
        }
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
    protected getCostApproachCurrency(element: JSONataParsedObject): string {
        return element.cost_approach_currency;
    }

    private async startWorkflowRun(by_user?: string, dryRun = false, params?: unknown) {
        const startedAt = new Date();
        await this.updateRuntimeStatus(-1, 'Started on ' + startedAt, {
            by_user,
            dry_run: dryRun,
            started_at: startedAt,
            finished_at: null,
            params,
        });
    }

    private async updateRuntimeStatus(
        progress: number,
        status?: string,
        extra?: {
            started_at?: Date;
            finished_at?: Date | null;
            by_user?: string;
            params?: unknown;
            dry_run?: boolean;
        }
    ) {
        this.progress = progress;
        if (status !== undefined) this.status_text = status;
        if (!this.workflowReport?.id) return;

        this.workflowReport = await this.workflowReportService.updateStatus(this.workflowReport.id, {
            progress,
            status,
            started_at: extra?.started_at,
            finished_at: extra?.finished_at,
            by_user: extra?.by_user,
            params: extra?.params,
            dry_run: extra?.dry_run,
        });
    }

    private async finishWorkflowRun(
        status: string,
        statusText: string,
        content: {
            count_import?: number;
            count_update?: number;
            summary?: unknown;
        }
    ) {
        this.progress = 0;
        this.status_text = statusText;
        if (!this.workflowReport?.id) return;

        this.workflowReport = await this.workflowReportService.finish(this.workflowReport.id, {
            status,
            count_import: content.count_import,
            count_update: content.count_update,
            summary: content.summary,
        });
    }

    collectKeys(
        obj: unknown,
        depth = 3,
        prefix = ''
    ): string[] {
        if (depth === 0 || obj === null || typeof obj !== 'object') {
            return [];
        }

        return Object.keys(obj as Record<string, unknown>).flatMap(key => {
            const path = prefix ? `${prefix}.${key}` : key;
            const value = (obj as object)[key];

            return [
                path,
                ...this.collectKeys(value, depth - 1, path)
            ];
        });
    }
}
