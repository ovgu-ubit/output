import { HttpService } from '@nestjs/axios';
import { ConflictException, Injectable } from '@nestjs/common';
import { concatWith, delay, map, mergeAll, Observable, queueScheduler, scheduled } from 'rxjs';
import { Publication } from '../../entity/Publication';
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
import { Identifier } from '../../entity/Identifier';
import { Invoice } from '../../entity/Invoice';
import * as xmljs from 'xml-js';

@Injectable()
/**
 * abstract class for all API imports that are based on pagesize and offsets
 */
export class PubMedImportService extends AbstractImportService {

    constructor(protected publicationService: PublicationService, protected authorService: AuthorService,
        protected geService: GreaterEntityService, protected funderService: FunderService, protected publicationTypeService: PublicationTypeService,
        protected publisherService: PublisherService, protected oaService: OACategoryService, protected contractService: ContractService,
        protected costTypeService: CostTypeService, protected reportService: ReportItemService, protected instService: InstitutionService, protected languageService:LanguageService, 
        protected http: HttpService, private configService:ConfigService) {
        super(publicationService, authorService, geService, funderService, publicationTypeService, publisherService, oaService, contractService, costTypeService, reportService, instService, languageService);
        let tags = this.configService.get('searchTags');
        this.searchText = '('
        for (let tag of tags) {
            this.searchText+=tag+'[affiliation]+or+'
        }
        this.searchText = this.searchText.slice(0,this.searchText.length-4)+')'
    }

    name = 'PubMed';
    year = '2023';
    searchText = '';
    max = 9;
    delay = 200;
    parallelCalls = 1;

    private newPublications: Publication[] = [];
    private publicationsUpdate = [];
    private numberOfPublications: number;
    private processedPublications = 0;

    url_search = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
    url_fetch = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';

    
    request(id:number): Observable<any> {
        let url = this.url_fetch + `?db=pubmed&id=${id}`;
        return this.http.get(url, {responseType: 'document'}).pipe(delay(this.delay));
    }
    search(): Observable<any> {
        let url = this.url_search+ `?db=pubmed&term=${this.year}[dp]+and+${this.searchText}&retmax=${this.max}`;
        return this.http.get(url, {responseType: 'document'});
    }
    setReportingYear(year: string) {
       this.year = year;
    }

    /**
     * main method for import and updates, retrieves elements from API and saves the mapped entities to the DB
     */
    public async import(update: boolean, by_user?: string) {
        if (this.progress !== 0) throw new ConflictException('The import is already running, check status for further information.');
        this.progress = -1;
        this.status_text = 'Started on ' + new Date();
        this.report = this.reportService.createReport('Import',this.name, by_user);

        this.processedPublications = 0;
        this.newPublications = [];
        this.publicationsUpdate = [];
        this.numberOfPublications = 0;

        this.reportService.write(this.report, { type: 'info', timestamp: new Date(), origin: this.name, text: `Starting import with year ${this.year}` })

        let obs$ = [];
        this.search().pipe(map(resp => {
            let data = JSON.parse(xmljs.xml2json(resp.data, {compact: true}));
            //if (data['eSearchResult']['Count']['_text'] <= this.max) {
                this.numberOfPublications = Number(data['eSearchResult']['Count']['_text']);
                let ids = data['eSearchResult']['IdList']['Id'].map(e => e['_text'])
                for (let id of ids) {
                    obs$.push(this.request(id))
                }
                this.reportService.write(this.report, { type: 'info', timestamp: new Date(), origin: this.name, text: `${this.numberOfPublications} elements found` })
            //} else console.log('Error: Too many results')//TODO
            if (this.numberOfPublications<=0) {
                //finalize
                this.progress = 0;
                this.reportService.finish(this.report, {
                    status: 'Nothing to import on' + new Date(),
                    count_import: 0,
                    count_update: 0
                })
                this.status_text = 'Nothing to import on ' + new Date();
            }
            return null;
        }), concatWith(scheduled(obs$, queueScheduler).pipe(mergeAll(this.parallelCalls)))).subscribe({
            next: async (data: any) => {
                if (!data) return;
                let pub = JSON.parse(xmljs.xml2json(data.data, {compact: true}));
                console.log(pub['PubmedArticleSet']['PubmedArticle']['MedlineCitation']['Article']['ArticleTitle']['_text'])
                /*try {
                    for (let [idx, pub] of this.getData(data).entries()) {
                        if (!this.getDOI(pub) && !this.getTitle(pub)) {
                            this.reportService.write(this.report, { type: 'warning', timestamp: new Date(), origin: 'mapNew', text: 'Publication without title or doi is not imported '+this.getAuthors(pub) })
                            continue;
                        }
                        if (this.newPublications.find(e => e.doi && e.doi === this.getDOI(pub)) || this.publicationsUpdate.find(e => e.doi && e.doi === this.getDOI(pub))) {
                            this.reportService.write(this.report, { type: 'warning', timestamp: new Date(), origin: 'mapNew', text: 'Publication with doi '+this.getDOI(pub)+' has already been imported.' })
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
                }*/
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
    protected getDOI(element: any): string {
        throw new Error('Method not implemented.');
    }
    protected getTitle(element: any): string {
        throw new Error('Method not implemented.');
    }
    protected importTest(element: any): boolean {
        throw new Error('Method not implemented.');
    }
    protected getInstAuthors(element: any): { first_name: string; last_name: string; orcid?: string; affiliation?: string; corresponding?: boolean; }[] {
        throw new Error('Method not implemented.');
    }
    protected getAuthors(element: any): string {
        throw new Error('Method not implemented.');
    }
    protected getGreaterEntityIdentifier(element: any): Identifier[] {
        throw new Error('Method not implemented.');
    }
    protected getGreaterEntityName(element: any): string {
        throw new Error('Method not implemented.');
    }
    protected getPublisher(element: any): string {
        throw new Error('Method not implemented.');
    }
    protected getPubDate(element: any): Date {
        throw new Error('Method not implemented.');
    }
    protected getLink(element: any): string {
        throw new Error('Method not implemented.');
    }
    protected getLanguage(element: any): string {
        throw new Error('Method not implemented.');
    }
    protected getFunder(element: any): Funder[] {
        throw new Error('Method not implemented.');
    }
    protected getPubType(element: any): string {
        throw new Error('Method not implemented.');
    }
    protected getOACategory(element: any): string {
        throw new Error('Method not implemented.');
    }
    protected getContract(element: any): string {
        throw new Error('Method not implemented.');
    }
    protected getLicense(element: any): string {
        throw new Error('Method not implemented.');
    }
    protected getInvoiceInformation(element: any): Invoice[] {
        throw new Error('Method not implemented.');
    }
    protected getStatus(element: any): number {
        throw new Error('Method not implemented.');
    }
}