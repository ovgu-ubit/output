import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as moment from 'moment';
import * as Papa from 'papaparse';
import { CSVMapping, UpdateMapping, UpdateOptions } from '../../../../output-interfaces/Config';
import { Funder } from '../../entity/Funder';
import { GreaterEntity } from '../../entity/GreaterEntity';
import { Identifier } from '../../entity/Identifier';
import { Publication } from '../../entity/Publication';
import { Publisher } from '../../entity/Publisher';
import { AuthorService } from '../entities/author.service';
import { ContractService } from '../entities/contract.service';
import { FunderService } from '../entities/funder.service';
import { GreaterEntityService } from '../entities/greater-entitiy.service';
import { InstitutionService } from '../entities/institution.service';
import { InvoiceService } from '../entities/invoice.service';
import { LanguageService } from '../entities/language.service';
import { OACategoryService } from '../entities/oa-category.service';
import { PublicationTypeService } from '../entities/publication-type.service';
import { PublicationService } from '../entities/publication.service';
import { PublisherService } from '../entities/publisher.service';
import { RoleService } from '../entities/role.service';
import { ReportItemService } from '../report-item.service';
import { AbstractImportService } from './abstract-import';

@Injectable()
/**
 * abstract class for all API imports that are based on pagesize and offsets
 */
export class CSVImportService extends AbstractImportService {

    constructor(protected publicationService: PublicationService, protected authorService: AuthorService,
        protected geService: GreaterEntityService, protected funderService: FunderService, protected publicationTypeService: PublicationTypeService,
        protected publisherService: PublisherService, protected oaService: OACategoryService, protected contractService: ContractService,
        protected invoiceService: InvoiceService, protected reportService: ReportItemService, protected instService: InstitutionService,
        protected languageService: LanguageService, protected roleService: RoleService, protected configService: ConfigService) {
        super(publicationService, authorService, geService, funderService, publicationTypeService, publisherService, oaService, contractService, reportService, instService, languageService, roleService, invoiceService, configService);
        this.path = this.configService.get('CONFIG_PATH')
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
    private file: Express.Multer.File;
    private importConfig: CSVMapping;

    protected name = 'CSV-Import'

    private path: string;

    public setUp(file: Express.Multer.File, importConfig: CSVMapping, updateMapping?: UpdateMapping) {
        this.file = file;
        if (typeof importConfig == 'string') this.importConfig = JSON.parse(importConfig + '');
        else this.importConfig = importConfig;
        //this.name = this.importConfig.name;
        if (updateMapping) this.updateMapping = updateMapping;
    }

    public setReportingYear(year: string) {

    }

    /**
     * main method for import and updates, retrieves elements from CSV file and saves the mapped entities to the DB
     */
    public async import(update: boolean, by_user?: string) {
        if (this.progress !== 0) throw new ConflictException('The import is already running, check status for further information.');
        this.progress = -1;
        this.status_text = 'Started on ' + new Date();
        this.report = this.reportService.createReport('Import', 'CSV-Import', by_user);

        this.processedPublications = 0;
        this.newPublications = [];
        this.publicationsUpdate = [];
        this.numberOfPublications = 0;

        let delimiter = this.importConfig.delimiter.includes("\\t") ? "\t" : this.importConfig.delimiter;

        await Papa.parse(this.file.buffer.toString(), {
            encoding: this.importConfig.encoding,
            header: this.importConfig.header,
            quotes: this.importConfig.quotes,
            quoteChar: this.importConfig.quoteChar,
            delimiter,
            skipEmptyLines: true,
            complete: async (result, file) => {
                this.numberOfPublications = result.data.length;
                this.reportService.write(this.report, { type: 'info', timestamp: new Date(), origin: this.name, text: `Starting import with mapping ${this.importConfig.name}` })
                this.reportService.write(this.report, { type: 'info', timestamp: new Date(), origin: this.name, text: `${this.numberOfPublications} elements found` })
                if (this.checkFormat(result.data, this.importConfig)) {
                    try {
                        let data = result.data;
                        if (!data) return;
                        for (let pub of data) {
                            let flag = await this.publicationService.checkDOIorTitleAlreadyExists(this.getDOI(pub), this.getTitle(pub))
                            if (!flag) {
                                let pubNew = await this.mapNew(pub).catch(e => this.reportService.write(this.report, { type: 'error', publication_doi: this.getDOI(pub), publication_title: this.getTitle(pub), timestamp: new Date(), origin: 'mapNew', text: e.stack ? e.stack : e.message }));
                                if (pubNew) {
                                    this.newPublications.push(pubNew);
                                    this.reportService.write(this.report, { type: 'info', publication_doi: this.getDOI(pub), publication_title: this.getTitle(pub), timestamp: new Date(), origin: 'mapNew', text: `New publication imported` })
                                }
                            } else if (update) {
                                let orig = await this.publicationService.getPubwithDOIorTitle(this.getDOI(pub), this.getTitle(pub));
                                if (orig.locked) continue;
                                let pubUpd = await this.mapUpdate(pub, orig).catch(e => {
                                    this.reportService.write(this.report, { type: 'error', publication_id: orig.id, timestamp: new Date(), origin: 'mapUpdate', text: e.stack ? e.stack : e.message })
                                    return null;
                                })
                                if (pubUpd?.pub) {
                                    this.publicationsUpdate.push(pubUpd.pub);
                                    this.reportService.write(this.report, { type: 'info', publication_id: orig.id, timestamp: new Date(), origin: 'mapUpdate', text: `Publication updated (${pubUpd.fields.join(',')})` })
                                }
                            }
                            // Update Progress Value
                            this.processedPublications++;
                            if (this.progress !== 0) this.progress = (this.processedPublications) / this.numberOfPublications;
                        }
                        //finalize
                        this.progress = 0;
                        this.reportService.finish(this.report, {
                            status: 'Successfull import on ' + new Date(),
                            count_import: this.newPublications.length,
                            count_update: this.publicationsUpdate.length
                        })
                        this.status_text = 'Successfull import on ' + new Date();
                    } catch (err) {
                        this.progress = 0;
                        this.status_text = 'Error while importing on ' + new Date();
                        console.log(err.message);
                        this.reportService.finish(this.report, {
                            status: 'Error while importing on ' + new Date(),
                            count_import: this.newPublications.length,
                            count_update: this.publicationsUpdate.length
                        })
                    }
                } else {
                    this.progress = 0;
                    this.status_text = 'Error while importing on ' + new Date();
                    //console.log(this.file.filename + ' does not match the expected format.');
                    this.reportService.finish(this.report, {
                        status: 'Error while importing on ' + new Date() + ': ' + this.file.filename + ' does not match the expected format.',
                        count_import: this.newPublications.length,
                        count_update: this.publicationsUpdate.length
                    })
                }
            }
        });
    }

    checkFormat(data: any[], format: CSVMapping): boolean {
        if (data.length === 0) return true;
        for (let field in format.mapping) {
            if (format.mapping[field] && !format.mapping[field].toString().startsWith('$') && typeof format.mapping[field] !== 'boolean' && typeof data[0][format.mapping[field]] === 'undefined') {
                console.log(`Error while importing, expected field '${format.mapping[field]}', but was not found`);
                return false;
            }
        }
        return true;
    }

    protected getDOI(element: any): string {
        if (!this.importConfig.mapping.doi) return null;
        if (this.importConfig.mapping.doi.startsWith('$')) return this.importConfig.mapping.doi.slice(1, this.importConfig.mapping.doi.length);
        return element[this.importConfig.mapping.doi];
    }
    protected getTitle(element: any): string {
        if (!this.importConfig.mapping.title) return null;
        if (this.importConfig.mapping.title.startsWith('$')) return this.importConfig.mapping.title.slice(1, this.importConfig.mapping.title.length);
        return element[this.importConfig.mapping.title];
    }
    protected importTest(element: any): boolean {
        return true;
    }
    protected getInstAuthors(element: any): { first_name: string; last_name: string; orcid?: string; affiliation?: string; }[] {
        if (!this.importConfig.mapping.author_inst) return null;
        let string = '';
        if (this.importConfig.mapping.author_inst.startsWith('$')) string = this.importConfig.mapping.authors.slice(1, this.importConfig.mapping.authors.length);
        else string = element[this.importConfig.mapping.author_inst]
        let authors = this.importConfig.split_authors ? string.split(this.importConfig.split_authors) : [string];
        let res = [];
        for (let author of authors) {
            if (this.importConfig.last_name_first) res.push({ first_name: author.split(', ')[1], last_name: author.split(', ')[0] });
            else {
                let split = author.split(' ');
                if (split.length === 2) res.push({ first_name: split[0], last_name: split[1] });
                else if (split.length > 2) {
                    continue;
                }
                else res.push({ first_name: '', last_name: split[0] });
            }
        }
        return res;
    }
    protected getAuthors(element: any): string {
        if (!this.importConfig.mapping.authors) return null;
        if (this.importConfig.mapping.authors.startsWith('$')) return this.importConfig.mapping.authors.slice(1, this.importConfig.mapping.authors.length);
        return element[this.importConfig.mapping.authors];
    }
    getGreaterEntityIdentifier(element: any): Identifier[] {
        if (!this.importConfig.mapping.id_ge) return null;
        if (this.importConfig.mapping.id_ge.startsWith('$')) return [{ type: this.importConfig.id_ge_type, value: this.importConfig.mapping.id_ge.slice(1, this.importConfig.mapping.id_ge.length) }];
        return [{ type: this.importConfig.id_ge_type, value: element[this.importConfig.mapping.id_ge] }];
    }
    getGreaterEntityName(element: any): string {
        if (!this.importConfig.mapping.greater_entity) return null;
        if (this.importConfig.mapping.greater_entity.startsWith('$')) return this.importConfig.mapping.greater_entity.slice(1, this.importConfig.mapping.greater_entity.length);
        return element[this.importConfig.mapping.greater_entity];
    }
    protected getGreaterEntity(element: any): GreaterEntity {
        return {
            label: this.getGreaterEntityName(element),
            identifiers: this.getGreaterEntityIdentifier(element)
        }
    }
    protected getPublisher(element: any): Publisher {
        if (!this.importConfig.mapping.publisher) return null;
        if (this.importConfig.mapping.publisher.startsWith('$')) return { label: this.importConfig.mapping.publisher.slice(1, this.importConfig.mapping.publisher.length) };
        return { label: element[this.importConfig.mapping.publisher] };
    }
    protected getPubDate(element: any): Date | { pub_date?: Date, pub_date_print?: Date, pub_date_accepted?: Date, pub_date_submitted?: Date } {
        try {
            let datestring, mom, pub_date, pub_date_print, pub_date_accepted, pub_date_submitted;
            if (this.importConfig.mapping.pub_date_submitted) {
                datestring = this.importConfig.mapping.pub_date_submitted.startsWith('$') ? this.importConfig.mapping.pub_date_submitted.slice(1, this.importConfig.mapping.pub_date_submitted.length) : element[this.importConfig.mapping.pub_date_submitted];
                mom = moment.utc(datestring, this.importConfig.date_format);
                pub_date_submitted = mom.toDate();
            }

            if (this.importConfig.mapping.pub_date_accepted) {
                datestring = this.importConfig.mapping.pub_date_accepted.startsWith('$') ? this.importConfig.mapping.pub_date_accepted.slice(1, this.importConfig.mapping.pub_date_accepted.length) : element[this.importConfig.mapping.pub_date_accepted];
                mom = moment.utc(datestring, this.importConfig.date_format);
                pub_date_accepted = mom.toDate();
            }

            if (this.importConfig.mapping.pub_date_print) {
                datestring = this.importConfig.mapping.pub_date_print.startsWith('$') ? this.importConfig.mapping.pub_date_print.slice(1, this.importConfig.mapping.pub_date_print.length) : element[this.importConfig.mapping.pub_date_print];
                mom = moment.utc(datestring, this.importConfig.date_format);
                pub_date_print = mom.toDate();
            }

            if (this.importConfig.mapping.pub_date) {
                datestring = this.importConfig.mapping.pub_date.startsWith('$') ? this.importConfig.mapping.pub_date.slice(1, this.importConfig.mapping.pub_date.length) : element[this.importConfig.mapping.pub_date];
                mom = moment.utc(datestring, this.importConfig.date_format);
                pub_date = mom.toDate();
            }

            return {
                pub_date,
                pub_date_print,
                pub_date_accepted,
                pub_date_submitted
            }
        } catch (err) {
            return null;
        }
    }
    protected getLink(element: any): string {
        if (!this.importConfig.mapping.link) return null;
        if (this.importConfig.mapping.link.startsWith('$')) return this.importConfig.mapping.link.slice(1, this.importConfig.mapping.link.length);
        return element[this.importConfig.mapping.link];
    }
    protected getLanguage(element: any): string {
        if (!this.importConfig.mapping.language) return null;
        if (this.importConfig.mapping.language.startsWith('$')) return this.importConfig.mapping.language.slice(1, this.importConfig.mapping.language.length);
        return element[this.importConfig.mapping.language];
    }
    protected getFunder(element: any): Funder[] {
        if (!this.importConfig.mapping.funder) return null;
        if (this.importConfig.mapping.funder.startsWith('$')) return [{ label: this.importConfig.mapping.funder.slice(1, this.importConfig.mapping.funder.length) }];
        return [{ label: element[this.importConfig.mapping.funder] }];
    }
    protected getPubType(element: any): string {
        if (!this.importConfig.mapping.pub_type) return null;
        if (this.importConfig.mapping.pub_type.startsWith('$')) return this.importConfig.mapping.pub_type.slice(1, this.importConfig.mapping.pub_type.length);
        return element[this.importConfig.mapping.pub_type];
    }
    protected getOACategory(element: any): string {
        if (!this.importConfig.mapping.oa_category) return null;
        if (this.importConfig.mapping.oa_category.startsWith('$')) return this.importConfig.mapping.oa_category.slice(1, this.importConfig.mapping.oa_category.length);
        return element[this.importConfig.mapping.oa_category];
    }
    protected getContract(element: any): string {
        if (!this.importConfig.mapping.contract) return null;
        if (this.importConfig.mapping.contract.startsWith('$')) return this.importConfig.mapping.contract.slice(1, this.importConfig.mapping.contract.length);
        return element[this.importConfig.mapping.contract];
    }
    protected getLicense(element: any): string {
        if (!this.importConfig.mapping.license) return null;
        if (this.importConfig.mapping.license.startsWith('$')) return this.importConfig.mapping.license.slice(1, this.importConfig.mapping.license.length);
        return element[this.importConfig.mapping.license];
    }
    protected getInvoiceInformation(element: any) {
        let res: any[] = [];
        if (this.importConfig.mapping.invoice && this.importConfig.mapping.invoice.startsWith('$')) res = [{
            cost_items: [{
                euro_value: this.parseNumber(this.importConfig.mapping.invoice.slice(1, this.importConfig.mapping.invoice.length)),
                cost_type: null
            }]
        }];
        else if (this.importConfig.mapping.invoice) {
            res = [{
                cost_items: [{
                    euro_value: this.parseNumber(element[this.importConfig.mapping.invoice]),
                    cost_type: null
                }]
            }]
        } if (this.importConfig.deal_flat_fee) {
            if (!res) res = [{
                cost_items: [{
                    euro_value: 100,
                    vat: 7,
                    cost_type: 'DEAL Servicepauschale'
                }]
            }]
            else res.push({
                cost_items: [{
                    euro_value: 100,
                    vat: 7,
                    cost_type: 'DEAL Servicepauschale'
                }]
            })
        }
        return res;
    }
    protected getStatus(element: any): number {
        try {
            if (!this.importConfig.mapping.status) return null;
            if (this.importConfig.mapping.status.startsWith('$')) return this.parseNumber(this.importConfig.mapping.status.slice(1, this.importConfig.mapping.status.length));
            return this.parseNumber(element[this.importConfig.mapping.status]);
        } catch (err) {
            return null;
        }
    }
    protected getAbstract(element: any): string {
        if (!this.importConfig.mapping.abstract) return null;
        if (this.importConfig.mapping.abstract.startsWith('$')) return this.importConfig.mapping.abstract.slice(1, this.importConfig.mapping.abstract.length);
        return element[this.importConfig.mapping.abstract];
    }
    protected getCitation(element: any): { volume?: string, issue?: string, first_page?: string, last_page?: string, publisher_location?: string, edition?: string, article_number?: string } {
        let volume = null;
        if (this.importConfig.mapping.volume) {
            if (this.importConfig.mapping.volume.startsWith('$')) volume = this.importConfig.mapping.volume.slice(1, this.importConfig.mapping.volume.length);
            else volume = element[this.importConfig.mapping.volume];
        }
        let issue = null;
        if (this.importConfig.mapping.issue) {
            if (this.importConfig.mapping.issue.startsWith('$')) issue = this.importConfig.mapping.issue.slice(1, this.importConfig.mapping.issue.length);
            else issue = element[this.importConfig.mapping.issue];
        }
        let first_page = null;
        if (this.importConfig.mapping.first_page) {
            if (this.importConfig.mapping.first_page.startsWith('$')) first_page = this.importConfig.mapping.first_page.slice(1, this.importConfig.mapping.first_page.length);
            else first_page = element[this.importConfig.mapping.first_page];
        }
        let last_page = null;
        if (this.importConfig.mapping.last_page) {
            if (this.importConfig.mapping.last_page.startsWith('$')) last_page = this.importConfig.mapping.last_page.slice(1, this.importConfig.mapping.last_page.length);
            else last_page = element[this.importConfig.mapping.last_page];
        }
        let publisher_location = null;
        if (this.importConfig.mapping.publisher_location) {
            if (this.importConfig.mapping.publisher_location.startsWith('$')) publisher_location = this.importConfig.mapping.publisher_location.slice(1, this.importConfig.mapping.publisher_location.length);
            else publisher_location = element[this.importConfig.mapping.publisher_location];
        }
        let edition = null;
        if (this.importConfig.mapping.edition) {
            if (this.importConfig.mapping.edition.startsWith('$')) edition = this.importConfig.mapping.edition.slice(1, this.importConfig.mapping.edition.length);
            else edition = element[this.importConfig.mapping.edition];
        }
        let article_number = null;
        if (this.importConfig.mapping.article_number) {
            if (this.importConfig.mapping.article_number.startsWith('$')) article_number = this.importConfig.mapping.article_number.slice(1, this.importConfig.mapping.article_number.length);
            else article_number = element[this.importConfig.mapping.article_number];
        }

        return {
            volume,
            issue,
            first_page,
            last_page,
            publisher_location,
            edition,
            article_number
        }
    }
    protected getPageCount(element: any): number {
        try {
            if (!this.importConfig.mapping.page_count) return null;
            if (this.importConfig.mapping.page_count.startsWith('$')) return this.parseNumber(this.importConfig.mapping.page_count.slice(1, this.importConfig.mapping.page_count.length));
            return this.parseNumber(element[this.importConfig.mapping.page_count]);
        } catch (err) {
            return null;
        }
    }
    protected getPeerReviewed(element: any): boolean {
        try {
            if (!this.importConfig.mapping.peer_reviewed) return null;
            if (this.importConfig.mapping.peer_reviewed.startsWith('$')) return Boolean(this.importConfig.mapping.peer_reviewed.slice(1, this.importConfig.mapping.peer_reviewed.length));
            return Boolean(element[this.importConfig.mapping.peer_reviewed]);
        } catch (err) {
            return null;
        }
    }
    protected getCostApproach(element: any): number {
        try {
            if (!this.importConfig.mapping.cost_approach) return null;
            if (this.importConfig.mapping.cost_approach.startsWith('$')) return this.parseNumber(this.importConfig.mapping.cost_approach.slice(1, this.importConfig.mapping.cost_approach.length));
            let e = element[this.importConfig.mapping.cost_approach];
            return this.parseNumber(e);
        } catch (err) {
            return null;
        }
    }

    getConfigs() {
        return fs.readFileSync(this.path + 'csv-mappings.json').toString();
    }

    addConfig(csv_mapping: CSVMapping) {
        let configs = JSON.parse(this.getConfigs()) as CSVMapping[];
        if (configs.find(e => e.name === csv_mapping.name)) configs = configs.filter(e => e.name !== csv_mapping.name);
        configs.push(csv_mapping);
        return fs.writeFileSync(this.path + 'csv-mappings.json', JSON.stringify(configs))
    }

    deleteConfig(name: string) {
        let configs = JSON.parse(this.getConfigs()) as CSVMapping[];
        configs = configs.filter(e => e.name !== name);
        return fs.writeFileSync(this.path + 'csv-mappings.json', JSON.stringify(configs))
    }

    parseNumber(toParse: string): number {
        let german = new RegExp("^([0-9]{1,3}(\.[0-9]{3})+|[0-9]+)(,[0-9]{1,2})?$", "g");
        let parse = german.exec(toParse);
        if (parse && parse.length > 0) {
            toParse = parse[0].replace(/\./g, "").replace(/,/g, ".");
        }
        return Number(toParse);
    }

}