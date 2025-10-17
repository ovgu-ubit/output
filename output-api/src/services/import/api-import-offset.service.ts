import { HttpService } from '@nestjs/axios';
import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, concatWith, map, mergeAll, queueScheduler, scheduled } from 'rxjs';
import { Publication } from '../../publication/Publication';
import { AuthorService } from '../../author/author.service';
import { ContractService } from '../../contract/contract.service';
import { FunderService } from '../../funder/funder.service';
import { GreaterEntityService } from '../../greater_entity/greater-entitiy.service';
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
 * abstract class for all API imports that are based on pagesize and offsets
 */
export abstract class ApiImportOffsetService extends AbstractImportService {

    constructor(protected publicationService: PublicationService, protected authorService: AuthorService,
        protected geService: GreaterEntityService, protected funderService: FunderService, protected publicationTypeService: PublicationTypeService,
        protected publisherService: PublisherService, protected oaService: OACategoryService, protected contractService: ContractService,
        protected invoiceService: InvoiceService, protected reportService: ReportItemService, protected instService: InstitutionService, protected languageService: LanguageService, protected roleService: RoleService, protected configService: ConfigService,
        protected http: HttpService) {
        super(publicationService, authorService, geService, funderService, publicationTypeService, publisherService, oaService, contractService, reportService, instService, languageService, roleService, invoiceService, configService);
    }

    private newPublications: Publication[] = [];
    private publicationsUpdate = [];
    private numberOfPublications: number;
    private processedPublications = 0;
    private completeURL = '';

    /**
     * the url basis of the api import service
     */
    protected url = '';
    /**
     * maximum results to be requested per request
     */
    protected max_res: number = 100;
    /**
     * name of the URL query param for maximum results per request
     */
    protected max_res_name = '';
    /**
     * name of the URL query param for a request's offset
     */
    protected offset_name = '';
    /**
     * value of the URL query param for a request's offset to retrieve a count element
     */
    protected offset_count = 0;
    /**
     * initial value of the URL query param for a request's offset for first data request
     */
    protected offset_start = 1;
    /**
     * additional query params as an array of key and value pairs
     */
    protected params: { key: string, value: string }[] = [];
    /**
     * number of parallel calls to accelerate the retrievement
     */
    protected parallelCalls = 1;
    /**
     * retrieves the total number of items based on a response object
     * @param response 
     */
    protected abstract getNumber(response: any): number;
    /**
     * retrieves the array of elements that represent publication objects from a response object
     * @param response 
     */
    protected abstract getData(response: any): any[];

    /**
     * to be overloaded if data requests are not made using URL query params
     * @param offset 
     * @returns an observable http request
     */
    protected request(offset: number): Observable<any> {
        let url = this.completeURL + `&${this.offset_name}=` + offset;
        return this.http.get(url);
    }

    /**
     * to be overloaded if the count cannot be queried using a offset parameter
     * @returns an observable http request 
     */
    protected retrieveCountRequest() {
        return this.request(this.offset_count);
    }

    /**
     * main method for import and updates, retrieves elements from API and saves the mapped entities to the DB
     */
    public async import(update: boolean, by_user?: string) {
        if (this.progress !== 0) throw new ConflictException('The import is already running, check status for further information.');
        this.progress = -1;
        this.status_text = 'Started on ' + new Date();
        this.report = this.reportService.createReport('Import', this.name, by_user);

        if (!this.url.endsWith('?') && this.params.length !== 0) this.completeURL = this.url + '?';
        else this.completeURL = this.url;
        this.params.forEach(e => {
            this.completeURL += `${e.key}=${e.value}&`;
        })
        this.completeURL += `${this.max_res_name}=${this.max_res}`;

        this.processedPublications = 0;
        this.newPublications = [];
        this.publicationsUpdate = [];
        this.numberOfPublications = 0;

        let obs$ = [];
        this.retrieveCountRequest().pipe(map(resp => {
            this.numberOfPublications = this.getNumber(resp);
            this.reportService.write(this.report, { type: 'info', timestamp: new Date(), origin: this.name, text: `Starting import with parameters ${this.params.map(e => e.key + ': ' + e.value).join('; ')}` })
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
            let offset = this.offset_start - this.max_res;
            do {
                offset += this.max_res;
                obs$.push(this.request(offset));
            } while (offset + this.max_res <= this.numberOfPublications)
            return null;
        }), concatWith(scheduled(obs$, queueScheduler).pipe(mergeAll(this.parallelCalls)))).subscribe({
            next: async (data: any) => {
                if (!data) return;
                try {
                    for (let [idx, pub] of this.getData(data).entries()) {
                        if (!this.getDOI(pub) && !this.getTitle(pub)) {
                            this.reportService.write(this.report, { type: 'warning', timestamp: new Date(), origin: 'mapNew', text: 'Publication without title or doi is not imported ' + this.getAuthors(pub) })
                            continue;
                        }
                        if (this.newPublications.find(e => e.doi && e.doi === this.getDOI(pub)) || this.publicationsUpdate.find(e => e.doi && e.doi === this.getDOI(pub))) {
                            this.reportService.write(this.report, { type: 'warning', timestamp: new Date(), origin: 'mapNew', text: 'Publication with doi ' + this.getDOI(pub) + ' has already been imported.' })
                            continue;
                        }
                        let flag = await this.publicationService.checkDOIorTitleAlreadyExists(this.getDOI(pub), this.getTitle(pub))
                        if (!flag) {
                            let pubNew = await this.mapNew(pub).catch(e => {
                                this.reportService.write(this.report, { type: 'error', publication_doi: this.getDOI(pub), publication_title: this.getTitle(pub), timestamp: new Date(), origin: 'mapNew', text: e.stack ? e.stack : e.message })
                                //console.log('Error while mapping publication ' + this.getDOI(pub) + ' with title ' + this.getTitle(pub) + ': ' + e.message + ' with stack ' + e.stack)
                            });
                            if (pubNew) {
                                this.newPublications.push(pubNew);
                                this.reportService.write(this.report, { type: 'info', publication_doi: this.getDOI(pub), publication_title: this.getTitle(pub), timestamp: new Date(), origin: 'mapNew', text: `New publication imported` })
                            }
                        } else if (update) {
                            let orig = await this.publicationService.getPubwithDOIorTitle(this.getDOI(pub), this.getTitle(pub));
                            if (orig.locked || orig.delete_date) continue;
                            let pubUpd = await this.mapUpdate(pub, orig).catch(e => {
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
                    this.processedPublications += this.getData(data).length;
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
}