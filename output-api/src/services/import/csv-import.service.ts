import { ConflictException, Injectable } from '@nestjs/common';
import { Funder } from '../../entity/Funder';
import { Identifier } from '../../entity/Identifier';
import { Publication } from '../../entity/Publication';
import { AuthorService } from '../entities/author.service';
import { ContractService } from '../entities/contract.service';
import { FunderService } from '../entities/funder.service';
import { GreaterEntityService } from '../entities/greater-entitiy.service';
import { OACategoryService } from '../entities/oa-category.service';
import { PublicationTypeService } from '../entities/publication-type.service';
import { PublicationService } from '../entities/publication.service';
import { PublisherService } from '../entities/publisher.service';
import { AbstractImportService } from './abstract-import';
import * as Papa from 'papaparse';
import { CSVMapping, UpdateMapping, UpdateOptions } from '../../../../output-interfaces/Config';
import * as moment from 'moment';
import { CostTypeService } from '../entities/cost-type.service';
import { ReportItemService } from '../report-item.service';
import { InstitutionService } from '../entities/institution.service';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';
import { LanguageService } from '../entities/language.service';
import { Publisher } from '../../entity/Publisher';

@Injectable()
/**
 * abstract class for all API imports that are based on pagesize and offsets
 */
export class CSVImportService extends AbstractImportService {

    constructor(protected publicationService: PublicationService, protected authorService: AuthorService,
        protected geService: GreaterEntityService, protected funderService: FunderService, protected publicationTypeService: PublicationTypeService,
        protected publisherService: PublisherService, protected oaService: OACategoryService, protected contractService: ContractService,
        protected costTypeService: CostTypeService, protected reportService: ReportItemService, protected instService:InstitutionService, 
        protected languageService:LanguageService,
        private configService:ConfigService) {
        super(publicationService, authorService, geService, funderService, publicationTypeService, publisherService, oaService, contractService, costTypeService, reportService,instService, languageService);
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
        editors :UpdateOptions.REPLACE_IF_EMPTY,
        abstract :UpdateOptions.REPLACE_IF_EMPTY,
        citation :UpdateOptions.REPLACE_IF_EMPTY,
        page_count :UpdateOptions.REPLACE_IF_EMPTY,
        peer_reviewed :UpdateOptions.REPLACE_IF_EMPTY,
    };

    private newPublications: Publication[] = [];
    private publicationsUpdate = [];
    private numberOfPublications: number;
    private processedPublications = 0;
    private file: Express.Multer.File;
    private importConfig: CSVMapping;

    protected name = 'CSV-Import'

    private path = this.configService.get('CONFIG_PATH');

    public setUp(file: Express.Multer.File, importConfig: CSVMapping, updateMapping?: UpdateMapping) {
        this.file = file;
        if (typeof importConfig == 'string') this.importConfig = JSON.parse(importConfig+'');
        else this.importConfig = importConfig;
        this.name = this.importConfig.name;
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
        this.report = this.reportService.createReport('Import','CSV-Import', by_user);

        this.processedPublications = 0;
        this.newPublications = [];
        this.publicationsUpdate = [];
        this.numberOfPublications = 0;

        await Papa.parse(this.file.buffer.toString(), {
            encoding: this.importConfig.encoding,
            header: this.importConfig.header,
            quotes: this.importConfig.quotes,
            quoteChar: this.importConfig.quoteChar,
            delimiter: this.importConfig.delimiter,
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
                    console.log(this.file.filename + ' does not match the expected format.');
                    this.reportService.finish(this.report, {
                        status: 'Error while importing on ' + new Date()+': '+this.file.filename + ' does not match the expected format.',
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
        return null;
    }
    protected getAuthors(element: any): string {
        if (!this.importConfig.mapping.authors) return null;
        if (this.importConfig.mapping.authors.startsWith('$')) return this.importConfig.mapping.authors.slice(1, this.importConfig.mapping.authors.length);
        return element[this.importConfig.mapping.authors];
    }
    protected getGreaterEntityIdentifier(element: any): Identifier[] {
        if (!this.importConfig.mapping.id_ge) return null;
        if (this.importConfig.mapping.id_ge.startsWith('$')) return [{ type: this.importConfig.id_ge_type, value: this.importConfig.mapping.id_ge.slice(1, this.importConfig.mapping.id_ge.length) }];
        return [{ type: this.importConfig.id_ge_type, value: element[this.importConfig.mapping.id_ge] }];
    }
    protected getGreaterEntityName(element: any): string {
        if (!this.importConfig.mapping.greater_entity) return null;
        if (this.importConfig.mapping.greater_entity.startsWith('$')) return this.importConfig.mapping.greater_entity.slice(1, this.importConfig.mapping.greater_entity.length);
        return element[this.importConfig.mapping.greater_entity];
    }
    protected getPublisher(element: any): Publisher {
        if (!this.importConfig.mapping.publisher) return null;
        if (this.importConfig.mapping.publisher.startsWith('$')) return {label: this.importConfig.mapping.publisher.slice(1, this.importConfig.mapping.publisher.length)};
        return {label: element[this.importConfig.mapping.publisher]};
    }
    protected getPubDate(element: any): Date {
        if (!this.importConfig.mapping.pub_date) return null;
        let datestring = this.importConfig.mapping.pub_date.startsWith('$') ? this.importConfig.mapping.pub_date.slice(1, this.importConfig.mapping.pub_date.length) : element[this.importConfig.mapping.pub_date];
        let mom = moment.utc(datestring, this.importConfig.date_format);
        return mom.toDate();
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
        if (!this.importConfig.mapping.invoice) return null;
        if (this.importConfig.mapping.invoice.startsWith('$')) return [{ 
            cost_items: [{
                price: Number(this.importConfig.mapping.invoice.slice(1, this.importConfig.mapping.invoice.length)), 
                currency: 'EUR', 
                cost_type: null 
            }]
        }];
        return [{
            cost_items: [{
                price: element[this.importConfig.mapping.invoice], 
                currency: 'EUR', 
                cost_type: null 
            }]
        }]
    }
    protected getStatus(element: any): number {
        if (!this.importConfig.mapping.status) return null;
        if (this.importConfig.mapping.status.startsWith('$')) return Number(this.importConfig.mapping.status.slice(1, this.importConfig.mapping.status.length));
        return element[this.importConfig.mapping.status];
    }
    protected getEditors(element: any): string {
        if (!this.importConfig.mapping.editors) return null;
        if (this.importConfig.mapping.editors.startsWith('$')) return this.importConfig.mapping.editors.slice(1, this.importConfig.mapping.editors.length);
        return element[this.importConfig.mapping.editors];
    }
    protected getAbstract(element: any): string {
        if (!this.importConfig.mapping.abstract) return null;
        if (this.importConfig.mapping.abstract.startsWith('$')) return this.importConfig.mapping.abstract.slice(1, this.importConfig.mapping.abstract.length);
        return element[this.importConfig.mapping.abstract];
    }
    protected getCitation(element: any): string {
        if (!this.importConfig.mapping.citation) return null;
        if (this.importConfig.mapping.citation.startsWith('$')) return this.importConfig.mapping.citation.slice(1, this.importConfig.mapping.citation.length);
        return element[this.importConfig.mapping.authors];
    }
    protected getPageCount(element: any): number {
        if (!this.importConfig.mapping.page_count) return null;
        if (this.importConfig.mapping.page_count.startsWith('$')) return Number(this.importConfig.mapping.page_count.slice(1, this.importConfig.mapping.page_count.length));
        return element[this.importConfig.mapping.page_count];
    }
    protected getPeerReviewed(element: any): boolean {
        if (!this.importConfig.mapping.peer_reviewed) return null;
        if (this.importConfig.mapping.peer_reviewed.startsWith('$')) return Boolean(this.importConfig.mapping.peer_reviewed.slice(1, this.importConfig.mapping.peer_reviewed.length));
        return element[this.importConfig.mapping.peer_reviewed];
    }

    getConfigs() {
        return fs.readFileSync(this.path+'csv-mappings.json').toString();
    }

    addConfig(csv_mapping:CSVMapping) {
        let configs = JSON.parse(this.getConfigs()) as CSVMapping[];
        if (configs.find(e => e.name === csv_mapping.name)) configs = configs.filter(e => e.name !== csv_mapping.name);
        configs.push(csv_mapping);
        return fs.writeFileSync(this.path+'csv-mappings.json', JSON.stringify(configs))
    }

    deleteConfig(name:string) {
        let configs = JSON.parse(this.getConfigs()) as CSVMapping[];
        configs = configs.filter(e => e.name !== name);
        return fs.writeFileSync(this.path+'csv-mappings.json', JSON.stringify(configs))
    }

}