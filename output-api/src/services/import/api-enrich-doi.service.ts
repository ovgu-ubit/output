import { HttpService } from '@nestjs/axios';
import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, catchError, mergeAll, of, queueScheduler, scheduled } from 'rxjs';
import { FindManyOptions } from 'typeorm';
import { AuthorService } from '../entities/author.service';
import { ContractService } from '../entities/contract.service';
import { FunderService } from '../entities/funder.service';
import { GreaterEntityService } from '../entities/greater-entitiy.service';
import { InstitutionService } from '../../institute/institution.service';
import { InvoiceService } from '../entities/invoice.service';
import { LanguageService } from '../entities/language.service';
import { OACategoryService } from '../entities/oa-category.service';
import { PublicationTypeService } from '../entities/publication-type.service';
import { PublicationService } from '../../publication/publication.service';
import { PublisherService } from '../entities/publisher.service';
import { RoleService } from '../entities/role.service';
import { ReportItemService } from '../report-item.service';
import { AbstractImportService } from './abstract-import';

@Injectable()
/**
 * abstract class for all API enrichs that are based on DOI URL request
 */
export abstract class ApiEnrichDOIService extends AbstractImportService {

    constructor(protected publicationService: PublicationService, protected authorService: AuthorService,
        protected geService: GreaterEntityService, protected funderService: FunderService, protected publicationTypeService: PublicationTypeService,
        protected publisherService: PublisherService, protected oaService: OACategoryService, protected contractService: ContractService,
        protected invoiceService: InvoiceService, protected reportService: ReportItemService, protected instService: InstitutionService, protected languageService: LanguageService, protected roleService: RoleService,
        protected configService: ConfigService, protected http: HttpService) {
        super(publicationService, authorService, geService, funderService, publicationTypeService, publisherService, oaService, contractService, reportService, instService, languageService, roleService, invoiceService, configService);
    }

    private publicationsUpdate = [];
    private processedPublications = 0;
    private errors = 0;

    /**
     * the url basis of the api import service
     */
    protected url = '';
    /**
     * additional query params as a query string
     */
    protected param_string: string = '';
    /**
     * number of parallel calls to accelerate the retrievement
     */
    protected parallelCalls = 5;
    /**
     * Where-Options for selecting publications
     */
    protected whereClause: FindManyOptions = null;

    public setReportingYear(year: string) {

    }

    public setWhereClause(whereClause: FindManyOptions) {
        this.whereClause = whereClause;
    }
    /**
     * retrieves the array of elements that represent publication objects from a response object
     * @param response 
     */
    protected abstract getData(response: any): any;

    /**
     * method to create a query URL, must be overwritten if DOI is not an Endpoint itself
     * @param doi 
     * @returns 
     */
    protected createUrl(doi: string) {
        if (this.param_string) return `${this.url}${doi}?${this.param_string}`;
        else return `${this.url}${doi}`;
    }

    private request(doi: string): Observable<any> {
        let url = this.createUrl(doi);
        return this.http.get(url).pipe(catchError((error, caught) => {
            if (error.response?.status === 404) {
                this.reportService.write(this.report, { type: 'warning', timestamp: new Date(), origin: 'import', text: 'Not found: ' + doi })
            } else if (error.response?.status === 422) {
                this.reportService.write(this.report, { type: 'warning', timestamp: new Date(), origin: 'import', text: 'Unprocessable Entity: ' + doi })
            }
            else this.reportService.write(this.report, { type: 'error', timestamp: new Date(), origin: 'import', text: `Error while processing data chunk: ${error}` })
            this.errors++;
            return of(null);
        }));
    }

    /**
     * main method for import and updates, retrieves elements from API and saves the mapped entities to the DB
     */
    public async import(update: boolean, by_user?: string) {
        if (this.progress !== 0) throw new ConflictException('The enrich is already running, check status for further information.');
        this.progress = -1;
        this.status_text = 'Started on ' + new Date();
        this.report = this.reportService.createReport('Enrich', this.name, by_user);

        this.processedPublications = 0;
        this.publicationsUpdate = [];
        this.errors = 0;
        let obs$ = [];
        let publications = (await this.publicationService.get(this.whereClause)).filter(pub => this.publicationService.isDOIvalid(pub) && !pub.locked && !pub.delete_date);
        if (!publications || publications.length === 0) {
            this.progress = 0;
            this.status_text = 'Nothing to enrich on ' + new Date();
            this.reportService.write(this.report, { type: 'warning', timestamp: new Date(), origin: this.name, text: `Nothing to enrich` })
            return;
        }
        for (let pub of publications) obs$.push(this.request(pub.doi));
        //console.log('Started enrich ' + this.name + ' for ' + publications.length + ' publications');
        this.reportService.write(this.report, { type: 'info', timestamp: new Date(), origin: this.name, text: `Starting import with where clause ${this.whereClause.toString()}` })
        this.reportService.write(this.report, { type: 'info', timestamp: new Date(), origin: this.name, text: `${publications.length} elements found` })
        scheduled(obs$, queueScheduler).pipe(mergeAll(this.parallelCalls)).subscribe({
            next: async (data: any) => {
                if (data) {
                    let item = this.getData(data);
                    if (item) {
                        //let orig = publications.find(e => e.doi.toLocaleLowerCase().trim().includes(this.getDOI(item).toLocaleLowerCase().trim()));
                        let orig = await this.publicationService.getPubwithDOIorTitle(this.getDOI(item)?.toLocaleLowerCase().trim(), this.getTitle(item)?.toLocaleLowerCase().trim())
                        if (!orig.locked) {
                            let pubUpd = await this.mapUpdate(item, orig).catch(e => {
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
                    } else this.errors++;
                } //else this.errors++;

                // Update Progress Value
                if (this.progress !== 0) this.progress = (this.processedPublications + this.errors) / publications.length;
                if (this.progress === 1) {
                    //console.log(this.publicationsUpdate.length + ' pubs update to DB, ' + this.errors + ' errors');
                    //finalize
                    this.progress = 0;
                    this.reportService.finish(this.report, {
                        status: 'Successfull enrich on ' + new Date(),
                        count_import: 0,
                        count_update: this.publicationsUpdate.length
                    })
                    this.status_text = 'Successfull enrich on ' + new Date();
                }
            }, error: err => {
                console.log(err.message);
                if (err.response) console.log(err.response.status + ': ' + err.response.statusText)
                this.progress = 0;
                this.status_text = 'Error while enriching on ' + new Date();
                this.reportService.finish(this.report, {
                    status: 'Error while importing on ' + new Date(),
                    count_import: 0,
                    count_update: this.publicationsUpdate.length
                })
            }
        });
    }
}