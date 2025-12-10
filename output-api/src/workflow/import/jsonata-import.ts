import { ConflictException, Injectable } from '@nestjs/common';
import jsonata from 'jsonata';
import { CSVMapping, UpdateMapping, UpdateOptions } from '../../../../output-interfaces/Config';
import { Funder } from '../../funder/Funder.entity';
import { GreaterEntity } from '../../greater_entity/GreaterEntity.entity';
import { GEIdentifier } from '../../greater_entity/GEIdentifier.entity';
import { Publication } from '../../publication/core/Publication.entity';
import { Publisher } from '../../publisher/Publisher.entity';
import { AuthorService } from '../../author/author.service';
import { ContractService } from '../../contract/contract.service';
import { FunderService } from '../../funder/funder.service';
import { GreaterEntityService } from '../../greater_entity/greater-entitiy.service';
import { InstituteService } from '../../institute/institute.service';
import { InvoiceService } from '../../invoice/invoice.service';
import { LanguageService } from '../../publication/lookups/language.service';
import { OACategoryService } from '../../oa_category/oa-category.service';
import { PublicationTypeService } from '../../pub_type/publication-type.service';
import { PublicationService } from '../../publication/core/publication.service';
import { PublisherService } from '../../publisher/publisher.service';
import { RoleService } from '../../publication/relations/role.service';
import { AbstractImportService, ImportService } from './abstract-import';
import { ReportItemService } from '../report-item.service';
import { AppConfigService } from '../../config/app-config.service';
import * as fs from 'fs';
import { concatWith, map, mergeAll, Observable, queueScheduler, scheduled } from 'rxjs';
import { HttpService } from '@nestjs/axios';

@ImportService({ path: 'jsonata' })
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
    protected params: { key: string, value: string }[] = [
        { key: 'query.affiliation', value: '' },
        { key: 'query.bibliographic', value: '' }];
    protected parallelCalls = 1;

    protected name = 'JSONata-Import'

    private path: string = 'jsonata';
    private searchText = '';
    private affiliation_tags = [];

    private completeURL = '';

    public async setUp(jsonata: string, updateMapping?: UpdateMapping) {
        this.importConfig = jsonata;
        //this.name = this.importConfig.name;
        if (updateMapping) this.updateMapping = updateMapping;
    }
    protected async getData(response: any) {
        return await Promise.all(response.data.message.items.map(e => this.transform(e)))
    }

    public async setReportingYear(year: string) {
        (await this.configService.get('search_tags')).forEach(tag => {
            this.searchText += tag + "+"
        })
        this.affiliation_tags = await this.configService.get('affiliation_tags')
        this.params = [
            { key: 'query.affiliation', value: this.searchText.slice(0, this.searchText.length - 1) },
            { key: 'query.bibliographic', value: year },
            { key: 'sort', value: 'indexed' }]//sorting avoids redundant publications in pages
    }

    async transform(element: any) {
        try {
            const mapping = jsonata(this.importConfig)
            const obj = (await mapping.evaluate(element))
            return obj;
        } catch (err) {
            console.log(err)
            return null;
        }
    }

    /**
     * main method for import and updates, retrieves elements from CSV file and saves the mapped entities to the DB
     */
    public async import(update: boolean, by_user?: string, dryRun = false) {
        if (this.progress !== 0) throw new ConflictException('The import is already running, check status for further information.');
        this.dryRun = dryRun;
        await this.setUp(fs.readFileSync('./templates/import/crossref.jsonata').toString());
        this.progress = -1;
        this.status_text = 'Started on ' + new Date();
        this.report = await this.reportService.createReport('Import', this.name, by_user);

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

        const obs$ = [];
        this.retrieveCountRequest().pipe(map(resp => {
            this.numberOfPublications = this.getNumber(resp);
            this.reportService.write(this.report, { type: 'info', timestamp: new Date(), origin: this.name, text: `Starting import with parameters ${this.params.map(e => e.key + ': ' + e.value).join('; ')} by user ${by_user}` + (dryRun ? " (simulated) " : "") })
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
                    const parsedData = await this.getData(data);
                    for (const [idx, pub] of parsedData.entries()) {
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

    protected retrieveCountRequest() {
        return this.request(this.offset_count);
    }
    protected request(offset: number): Observable<any> {
        const url = this.completeURL + `&${this.offset_name}=` + offset;
        return this.http.get(url);
    }

    protected getNumber(response: any): number {
        return response.data.message['total-results'];
    }
    protected importTest(element: any): boolean {
        return element && !(element.pub_type.includes('posted-content') || element.pub_type.includes('peer-review')) && (element.authors_inst)?.length > 0;
    }

    protected getDOI(element: any): string {
        return element.doi;
    }
    protected getTitle(element: any): string {
        return element.title;
    }
    protected getInstAuthors(element: any): { first_name: string; last_name: string; orcid?: string; affiliation?: string; }[] {
        return element.authors_inst;
    }
    protected getAuthors(element: any): string {
        return element.authors;
    }
    protected getGreaterEntity(element: any): GreaterEntity {
        return element.greater_entity;
    }
    protected getPublisher(element: any): Publisher {
        return element.publisher;
    }
    protected getPubDate(element: any): Date | { pub_date?: Date, pub_date_print?: Date, pub_date_accepted?: Date, pub_date_submitted?: Date } {
        return element.pub_date;
    }
    protected getLink(element: any): string {
        return element.link;
    }
    protected getLanguage(element: any): string {
        return element.language;
    }
    protected getFunder(element: any): Funder[] {
        return element.funder;
    }
    protected getPubType(element: any): string {
        return element.pub_type;
    }
    protected getOACategory(element: any): string {
        return element.oa_category;
    }
    protected getContract(element: any): string {
        return element.contract;
    }
    protected getLicense(element: any): string {
        return element.license;
    }
    protected getInvoiceInformation(element: any) {
        return element.invoices;
    }
    protected getStatus(element: any): number {
        return element.status;
    }
    protected getAbstract(element: any): string {
        return element.abstract;
    }
    protected getCitation(element: any): { volume?: string, issue?: string, first_page?: string, last_page?: string, publisher_location?: string, edition?: string, article_number?: string } {
        return element.citation;
    }
    protected getPageCount(element: any): number {
        return element.page_count;
    }
    protected getPeerReviewed(element: any): boolean {
        return element.peer_reviewed;
    }
    protected getCostApproach(element: any): number {
        return element.cost_approach;

    }
}