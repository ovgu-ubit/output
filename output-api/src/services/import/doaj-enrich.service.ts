import { HttpService } from '@nestjs/axios';
import { ConflictException, Injectable } from '@nestjs/common';
import { catchError, EMPTY, mergeAll, Observable, of, queueScheduler, scheduled } from 'rxjs';
import { FindManyOptions } from 'typeorm';
import { AuthorService } from '../entities/author.service';
import { ContractService } from '../entities/contract.service';
import { CostTypeService } from '../entities/cost-type.service';
import { FunderService } from '../entities/funder.service';
import { GreaterEntityService } from '../entities/greater-entitiy.service';
import { OACategoryService } from '../entities/oa-category.service';
import { PublicationTypeService } from '../entities/publication-type.service';
import { PublicationService } from '../entities/publication.service';
import { PublisherService } from '../entities/publisher.service';
import { ReportItemService } from '../report-item.service';
import { AbstractImportService } from './abstract-import';
import { InstitutionService } from '../entities/institution.service';
import { LanguageService } from '../entities/language.service';
import { ConfigService } from '@nestjs/config';
import { Funder } from '../../entity/Funder';
import { GreaterEntity } from '../../entity/GreaterEntity';
import { Invoice } from '../../entity/Invoice';
import { Publisher } from '../../entity/Publisher';
import { UpdateMapping, UpdateOptions } from '../../../../output-interfaces/Config';
import { RoleService } from '../entities/role.service';

@Injectable()
/**
 * abstract class for all API enrichs that are based on DOI URL request
 */
export class DOAJEnrichService extends AbstractImportService {

    protected updateMapping: UpdateMapping = {
        author_inst: UpdateOptions.IGNORE,
        authors: UpdateOptions.IGNORE,
        title: UpdateOptions.IGNORE,
        pub_type: UpdateOptions.IGNORE,
        oa_category: UpdateOptions.IGNORE,
        greater_entity: UpdateOptions.REPLACE,
        publisher: UpdateOptions.IGNORE,
        contract: UpdateOptions.IGNORE,
        funder: UpdateOptions.IGNORE,
        doi: UpdateOptions.IGNORE,
        pub_date: UpdateOptions.IGNORE,
        link: UpdateOptions.IGNORE,
        language: UpdateOptions.IGNORE,
        license: UpdateOptions.IGNORE,
        invoice: UpdateOptions.IGNORE,
        status: UpdateOptions.IGNORE,
        editors: UpdateOptions.IGNORE,
        abstract: UpdateOptions.IGNORE,
        citation: UpdateOptions.IGNORE,
        page_count: UpdateOptions.IGNORE,
        peer_reviewed: UpdateOptions.IGNORE,
    };

    public setReportingYear(year: string): void {
    }
    protected getDOI(element: any): string {
        return null;
    }
    protected getTitle(element: any): string {
        return null;
    }
    protected importTest(element: any): boolean {
        return null;
    }
    protected getInstAuthors(element: any): { first_name: string; last_name: string; orcid?: string; affiliation?: string; corresponding?: boolean; }[] {
        return null;
    }
    protected getAuthors(element: any): string {
        return null;
    }
    protected getGreaterEntity(element: any): GreaterEntity {
        if (!element || element['results'].length === 0) {
            return {
                label: null,
                doaj_until: new Date(),
                identifiers: [{type:'issn', value: element['query'].split(':')[1]}]
            }
        } else {
            console.log(element['results'][0]['bibjson']['oa_start'])
            console.log(new Date(element['results'][0]['bibjson']['oa_start'],0))
            return {
                label: element['results'][0]['bibjson']['title'],
                identifiers: [{type:'issn', value: element['results'][0]['bibjson']['eissn']}],
                doaj_since: new Date(element['results'][0]['bibjson']['oa_start'],0)
            }
        }
    }
    protected getPublisher(element: any): Publisher {
        return null;
    }
    protected getPubDate(element: any): Date | { pub_date?: Date; pub_date_print?: Date; pub_date_accepted?: Date; pub_date_submitted?: Date; } {
        return null;
    }
    protected getLink(element: any): string {
        return null;
    }
    protected getLanguage(element: any): string {
        return null;
    }
    protected getFunder(element: any): Funder[] {
        return null;
    }
    protected getPubType(element: any): string {
        return null;
    }
    protected getOACategory(element: any): string {
        return null;
    }
    protected getContract(element: any): string {
        return null;
    }
    protected getLicense(element: any): string {
        return null;
    }
    protected getInvoiceInformation(element: any): Invoice[] {
        return null;
    }
    protected getStatus(element: any): number {
        return null;
    }
    protected getEditors(element: any): string {
        return null;
    }
    protected getAbstract(element: any): string {
        return null;
    }
    protected getCitation(element: any): { volume: number, issue: number, first_page: number, last_page: number } {
        return null;
    }
    protected getPageCount(element: any): number {
        return null;
    }
    protected getPeerReviewed(element: any): boolean {
        return null;
    }

    constructor(protected publicationService: PublicationService, protected authorService: AuthorService,
        protected geService: GreaterEntityService, protected funderService: FunderService, protected publicationTypeService: PublicationTypeService,
        protected publisherService: PublisherService, protected oaService: OACategoryService, protected contractService: ContractService,
        protected costTypeService: CostTypeService, protected reportService: ReportItemService, protected instService: InstitutionService, protected languageService: LanguageService,  protected roleService: RoleService, protected configService: ConfigService, protected http: HttpService) {
        super(publicationService, authorService, geService, funderService, publicationTypeService, publisherService, oaService, contractService, costTypeService, reportService, instService, languageService, roleService, configService);
    }

    private publicationsUpdate = [];
    private processedPublications = 0;
    private errors = 0;

    protected url = 'https://doaj.org/api/search/journals/issn%3A';
    protected parallelCalls = 1;
    protected whereClause: FindManyOptions = null;
    protected name = 'DOAJ Enrich'

    public setWhereClause(whereClause: FindManyOptions) {
        this.whereClause = whereClause;
    }
    /**
     * retrieves the array of elements that represent publication objects from a response object
     * @param response 
     */
    protected getData(response: any): any {
        return response.data;
    }

    /**
     * method to create a query URL, must be overwritten if DOI is not an Endpoint itself
     * @param doi 
     * @returns 
     */
    protected createUrl(issn: string) {
        return `${this.url}${issn}`;
    }

    private request(issn: string): Observable<any> {
        let url = this.createUrl(issn);
        return this.http.get(url).pipe(catchError((error, caught) => {
            if (error.response?.status === 404) {
                this.reportService.write(this.report, { type: 'warning', timestamp: new Date(), origin: 'import', text: 'Not found: ' + issn })
            } else if (error.response?.status === 422) {
                this.reportService.write(this.report, { type: 'warning', timestamp: new Date(), origin: 'import', text: 'Unprocessable Entity: ' + issn })
            }
            else this.reportService.write(this.report, { type: 'error', timestamp: new Date(), origin: 'import', text: `Error while processing data chunk: ${error}` })
            this.errors++;
            return of(null);
        }));
    }

    uniqueGE = [];

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
        let publications = (await this.publicationService.get({...this.whereClause, relations: {greater_entity:{identifiers:true}}})).filter(pub => pub.greater_entity && !pub.locked && !pub.delete_date);
        this.uniqueGE = [];
        for (let pub of publications) {
            if (!pub.greater_entity.identifiers || !pub.greater_entity.identifiers.find(e => e.type === 'issn')) continue;
            let flag = false;
            for (let pub2 of this.uniqueGE) {
                if (pub2.greater_entity.id === pub.greater_entity.id) {
                    flag = true;
                    break;
                }
            }
            if (!flag) this.uniqueGE.push(pub)
        }
        if (this.uniqueGE.length === 0) {
            this.progress = 0;
            this.status_text = 'Nothing to enrich on ' + new Date();
            this.reportService.write(this.report, { type: 'warning', timestamp: new Date(), origin: this.name, text: `Nothing to enrich` })
            return;
        }

        for (let pub of this.uniqueGE) obs$.push(this.request(pub.greater_entity.identifiers.find(e => e.type === 'issn').value));
        //console.log('Started enrich ' + this.name + ' for ' + publications.length + ' publications');
        this.reportService.write(this.report, { type: 'info', timestamp: new Date(), origin: this.name, text: `Starting import with where clause ${this.whereClause.toString()}` })
        this.reportService.write(this.report, { type: 'info', timestamp: new Date(), origin: this.name, text: `${publications.length} elements found` })
        scheduled(obs$, queueScheduler).pipe(mergeAll(this.parallelCalls)).subscribe({
            next: async (data: any) => {
                if (data) {
                    let item = this.getData(data);
                    console.log(item['query'].split(':')[1])
                    if (item) {
                        let orig = this.uniqueGE.find(e => {
                            if (!e.greater_entity.identifiers) {
                                console.log(e.id)
                            }
                            return e.greater_entity.identifiers.find(e => e.type === 'issn').value === item['query'].split(':')[1]
                        })
                        let pubUpd = await this.mapUpdate(item, orig).catch(e => {
                            this.reportService.write(this.report, { type: 'error', publication_id: orig?.id, timestamp: new Date(), origin: 'mapUpdate', text: e.stack ? e.stack : e.message })
                            //console.log('Error while mapping update for publication ' + orig.id + ': ' + e.message)
                            return null;
                        });
                        if (pubUpd?.pub) {
                            this.publicationsUpdate.push(pubUpd.pub);
                            this.reportService.write(this.report, { type: 'info', publication_id: orig.id, timestamp: new Date(), origin: 'mapUpdate', text: `Publication updated (${pubUpd.fields.join(',')})` })
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