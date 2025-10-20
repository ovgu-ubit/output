import { HttpService } from '@nestjs/axios';
import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMPTY, Observable, concatMap, concatWith, delay, mergeAll, queueScheduler, scheduled } from 'rxjs';
import * as xmljs from 'xml-js';
import { UpdateMapping, UpdateOptions } from '../../../../output-interfaces/Config';
import { Funder } from '../../funder/Funder';
import { GreaterEntity } from '../../greater_entity/GreaterEntity';
import { Publication } from '../../publication/core/Publication';
import { Publisher } from '../../publisher/Publisher';
import { AuthorService } from '../../author/author.service';
import { ContractService } from '../../contract/contract.service';
import { FunderService } from '../../funder/funder.service';
import { GreaterEntityService } from '../../greater_entity/greater-entitiy.service';
import { InstitutionService } from '../../institute/institution.service';
import { InvoiceService } from '../../invoice/invoice.service';
import { LanguageService } from '../../publication/lookups/language.service';
import { OACategoryService } from '../../oa_category/oa-category.service';
import { PublicationTypeService } from '../../pub_type/publication-type.service';
import { PublicationService } from '../../publication/core/publication.service';
import { PublisherService } from '../../publisher/publisher.service';
import { RoleService } from '../../publication/relations/role.service';
import { ReportItemService } from '../report-item.service';
import { AbstractImportService } from './abstract-import';

@Injectable()
/**
 * abstract class for all API imports that are based on pagesize and offsets
 */
export class PubMedImportService extends AbstractImportService {

    constructor(protected publicationService: PublicationService, protected authorService: AuthorService,
        protected geService: GreaterEntityService, protected funderService: FunderService, protected publicationTypeService: PublicationTypeService,
        protected publisherService: PublisherService, protected oaService: OACategoryService, protected contractService: ContractService,
        protected invoiceService: InvoiceService, protected reportService: ReportItemService, protected instService: InstitutionService, protected languageService: LanguageService,  protected roleService: RoleService, protected configService: ConfigService,
        protected http: HttpService) {
        super(publicationService, authorService, geService, funderService, publicationTypeService, publisherService, oaService, contractService, reportService, instService, languageService, roleService, invoiceService, configService);
        let tags = this.configService.get('searchTags');
        this.searchText = '('
        for (let tag of tags) {
            this.searchText += tag + '[affiliation]+or+'
        }
        this.searchText = this.searchText.slice(0, this.searchText.length - 4) + ')'
    }

    name = 'PubMed';
    year = '2023';
    searchText = '';
    max = 1000;
    delay = 250;
    parallelCalls = 1;

    private newPublications: Publication[] = [];
    private publicationsUpdate = [];
    private numberOfPublications: number;
    private processedPublications = 0;

    obs$ = [];

    url_search = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
    url_fetch = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';

    protected updateMapping: UpdateMapping = {
        author_inst: UpdateOptions.APPEND,
        authors: UpdateOptions.REPLACE_IF_EMPTY,
        title: UpdateOptions.REPLACE_IF_EMPTY,
        pub_type: UpdateOptions.REPLACE_IF_EMPTY,
        oa_category: UpdateOptions.IGNORE,
        greater_entity: UpdateOptions.REPLACE_IF_EMPTY,
        publisher: UpdateOptions.IGNORE,
        contract: UpdateOptions.IGNORE,
        funder: UpdateOptions.IGNORE,
        doi: UpdateOptions.REPLACE_IF_EMPTY,
        pub_date: UpdateOptions.REPLACE_IF_EMPTY,
        link: UpdateOptions.IGNORE,
        language: UpdateOptions.REPLACE_IF_EMPTY,
        license: UpdateOptions.IGNORE,
        invoice: UpdateOptions.IGNORE,
        status: UpdateOptions.REPLACE_IF_EMPTY,
        abstract :UpdateOptions.REPLACE_IF_EMPTY,
        citation :UpdateOptions.IGNORE,
        page_count :UpdateOptions.IGNORE,
        peer_reviewed :UpdateOptions.IGNORE,
        cost_approach: UpdateOptions.REPLACE_IF_EMPTY,
    };

    request(id: number): Observable<any> {
        let url = this.url_fetch + `?db=pubmed&id=${id}`;
        return this.http.get(url, { responseType: 'document' }).pipe(delay(this.delay));
    }
    search(offset?: number): Observable<any> {
        let url = this.url_search + `?db=pubmed&term=${this.year}:${this.year}[dp]+and+${this.searchText}&retmax=${this.max}`;
        if (offset) url += '&retstart=' + offset
        return this.http.get(url, { responseType: 'document' }).pipe(concatMap(resp => {
            let data = JSON.parse(xmljs.xml2json(resp.data, { compact: true }));
            //if (data['eSearchResult']['Count']['_text'] <= this.max) {
            this.numberOfPublications = Number(data['eSearchResult']['Count']['_text']);
            let ids = data['eSearchResult']['IdList']['Id'].map(e => e['_text'])
            for (let id of ids) {
                this.obs$.push(this.request(id))
            }
            this.reportService.write(this.report, { type: 'info', timestamp: new Date(), origin: this.name, text: `${this.numberOfPublications} elements found` })
            //} else console.log('Error: Too many results')//TODO
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
            if (this.obs$.length < this.numberOfPublications) return this.search(this.obs$.length).pipe(delay(this.delay))
            else return EMPTY;
        }));
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
        this.report = this.reportService.createReport('Import', this.name, by_user);

        this.processedPublications = 0;
        this.newPublications = [];
        this.publicationsUpdate = [];
        this.numberOfPublications = 0;

        this.reportService.write(this.report, { type: 'info', timestamp: new Date(), origin: this.name, text: `Starting import with year ${this.year}` })

        this.obs$ = [];
        this.search().pipe(concatWith(scheduled(this.obs$, queueScheduler).pipe(mergeAll(this.parallelCalls)))).subscribe({
            next: async (data: any) => {
                if (!data) return;
                let pub = JSON.parse(xmljs.xml2json(data.data, { compact: true }));
                try {
                    pub = this.getData(pub);
                    if (!this.getDOI(pub) && !this.getTitle(pub)) {
                        this.reportService.write(this.report, { type: 'warning', timestamp: new Date(), origin: 'mapNew', text: 'Publication without title or doi is not imported ' + this.getAuthors(pub) })
                        return;
                    }
                    if (this.newPublications.find(e => e.doi && e.doi === this.getDOI(pub)) || this.publicationsUpdate.find(e => e.doi && e.doi === this.getDOI(pub))) {
                        this.reportService.write(this.report, { type: 'warning', timestamp: new Date(), origin: 'mapNew', text: 'Publication with doi ' + this.getDOI(pub) + ' has already been imported.' })
                        return;
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
                        if (orig.locked || orig.delete_date) return;
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
                } catch (e) {
                    this.numberOfPublications--;
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
    protected getData(element: any) {
        return element['PubmedArticleSet']['PubmedArticle']['MedlineCitation']
    }

    protected importTest(element: any): boolean {
        return element && this.authorsInstitution(element['Article']['AuthorList']['Author']);
    }

    public authorsInstitution(authors) {
        if (authors && Array.isArray(authors)) {
            let aut = authors.filter(author =>
                this.configService.get('affiliationTags').some(e => {
                    if (Array.isArray(author['AffiliationInfo'])) {
                        return author['AffiliationInfo'].some(f => f['Affiliation']['_text'].toLowerCase().includes(e))
                    }
                    else if (author['AffiliationInfo']) return author['AffiliationInfo']['Affiliation']['_text'].toLowerCase().includes(e)
                }
                ));
            return aut.length > 0;
        } else if (authors) {
            return this.configService.get('affiliationTags').some(e => {
                if (Array.isArray(authors['AffiliationInfo'])) {
                    return authors['AffiliationInfo'].some(f => f['Affiliation']['_text'].toLowerCase().includes(e))
                }
                else if (authors['AffiliationInfo']) return authors['AffiliationInfo']['Affiliation']['_text'].toLowerCase().includes(e)
            })
        }
        else return null;
    }

    protected getDOI(element: any): string {
        if (!element['Article']['ELocationID']) return '';
        if (Array.isArray(element['Article']['ELocationID'])) {
            return element['Article']['ELocationID'].find(e => e['_attributes']['EIdType'] == 'doi')?._text;
        } else return element['Article']['ELocationID']['_attributes']['EIdType'] == 'doi' ? element['Article']['ELocationID']['_text'] : '';
    }
    protected getTitle(element: any): string {
        let e = element['Article']['ArticleTitle']['_text'];
        if (Array.isArray(e)) return element['Article']['ArticleTitle']['_text'].reduce((acc, v, i) => acc + v, '')
        else return element['Article']['ArticleTitle']['_text']
    }
    protected getInstAuthors(element: any): { first_name: string; last_name: string; orcid?: string; affiliation?: string; corresponding?: boolean; }[] {
        let authors = element['Article']['AuthorList']['Author'];
        if (authors && Array.isArray(authors)) {
            let aut = authors.filter(e => this.isInstAuthor(e));
            return aut.map(e => { return { first_name: e['ForeName']['_text'], last_name: e['LastName']['_text'], affiliation: Array.isArray(e['AffiliationInfo']) ? this.findAffAuthor(e)['Affiliation']['_text'] : e['AffiliationInfo']['Affiliation']['_text'] } })
        } else if (authors) {
            if (authors['AffiliationInfo'] && this.configService.get('affiliationTags').some(e => {
                if (Array.isArray(authors['AffiliationInfo'])) {
                    return authors['AffiliationInfo'].some(f => f['Affiliation']['_text'].toLowerCase().includes(e))
                }
                else if (authors['AffiliationInfo']) return authors['AffiliationInfo']['Affiliation']['_text'].toLowerCase().includes(e)
            })) return [{ first_name: authors['ForeName']['_text'], last_name: authors['LastName']['_text'], affiliation: Array.isArray(authors['AffiliationInfo']) ? this.findAffAuthor(authors)['Affiliation']['_text'] : authors['AffiliationInfo']['Affiliation']['_text'] }]
        } else return [];
    }
    isInstAuthor(author) {
        return this.configService.get('affiliationTags').some(e => {
            if (Array.isArray(author['AffiliationInfo'])) {
                return author['AffiliationInfo'].some(f => f['Affiliation']['_text'].toLowerCase().includes(e))
            }
            else if (author['AffiliationInfo']) return author['AffiliationInfo']['Affiliation']['_text'].toLowerCase().includes(e)
        }
        );
    }
    findAffAuthor(author) {
        return author['AffiliationInfo'].find(e => this.configService.get('affiliationTags').some(f => {
            if (Array.isArray(e['Affiliation'])) return e['Affiliation'].some(g => g['_text'].toLowerCase().includes(f))
            else return e['Affiliation']['_text'].toLowerCase().includes(f)
        }));

    }

    protected getAuthors(element: any): string {
        if (Array.isArray(element['Article']['AuthorList']['Author'])) return this.constructAuthorsString(element['Article']['AuthorList']['Author'])
        else return this.constructAuthorsString([element['Article']['AuthorList']['Author']])
    }
    constructAuthorsString(element: any[]): string {
        let res = '';
        for (let aut of element) {
            if (aut['LastName']) res += aut['LastName']['_text']
            if (aut['ForeName']) res += ", " + aut['ForeName']['_text']
            if (res) res += "; ";
            //else if (aut['CollectiveName']) res += aut['CollectiveName']['_text']+ "; "
        }
        return res.slice(0, res.length - 2);
    }
    protected getGreaterEntity(element: any): GreaterEntity {
        return  {
            label: element['Article']['Journal'] && element['Article']['Journal']['Title']? element['Article']['Journal']['Title']['_text']: '',
            identifiers: element['Article']['Journal'] && element['Article']['Journal']['ISSN']? !Array.isArray(element['Article']['Journal']['ISSN'])? [{
                type: 'issn',
                value: element['Article']['Journal']['ISSN']['_text']
            }] : element['Article']['Journal']['ISSN'].map(e => { return { type: 'issn', value: e['_text'] } }) : undefined
        }
    }
    protected getPublisher(element: any): Publisher {
        return null;
    }
    protected getPubDate(element: any): Date {
        if (element['Article']['ArticleDate']) {
            if (Array.isArray(element['Article']['ArticleDate'])) {
                let e = element['Article']['ArticleDate'].find(e => e['_attributes']['DateType'].includes('elec'));
                if (e) return new Date(Date.UTC(e['Year']['_text'], Number(e['Month']['_text']) - 1, e['Day']['_text']))
            } else {
                return new Date(Date.UTC(element['Article']['ArticleDate']['Year']['_text'], Number(element['Article']['ArticleDate']['Month']['_text']) - 1, element['Article']['ArticleDate']['Day']['_text']))
            }
        } else if (element['Article']['Journal']['JournalIssue']['PubDate']) {
            if (!element['Article']['Journal']['JournalIssue']['PubDate']['Month'] && !element['Article']['Journal']['JournalIssue']['PubDate']['Day']) return new Date(Date.UTC(element['Article']['Journal']['JournalIssue']['PubDate']['Year']['_text'], 0, 1));
            let mon = element['Article']['Journal']['JournalIssue']['PubDate']['Month']['_text'];
            if (isNaN(mon)) {
                mon = this.mapMonToNumber(mon)
            }
            if (!element['Article']['Journal']['JournalIssue']['PubDate']['Day']) return new Date(Date.UTC(element['Article']['Journal']['JournalIssue']['PubDate']['Year']['_text'], Number(mon) - 1, 1))
            return new Date(Date.UTC(element['Article']['Journal']['JournalIssue']['PubDate']['Year']['_text'], Number(mon) - 1, element['Article']['Journal']['JournalIssue']['PubDate']['Day']['_text']))

        }
        return undefined;
    }
    mapMonToNumber(monthString) {
        if (monthString.includes('Jan')) return 1;
        else if (monthString.includes('Feb')) return 2;
        else if (monthString.includes('Mar')) return 3;
        else if (monthString.includes('Apr')) return 4;
        else if (monthString.includes('May')) return 5;
        else if (monthString.includes('Jun')) return 6;
        else if (monthString.includes('Jul')) return 7;
        else if (monthString.includes('Aug')) return 8;
        else if (monthString.includes('Sep')) return 9;
        else if (monthString.includes('Oct')) return 10;
        else if (monthString.includes('Nov')) return 11;
        else if (monthString.includes('Dec')) return 12;
        else return 1;
    }

    protected getLink(element: any): string {
        return undefined;
    }
    protected getLanguage(element: any): string {
        return element['Article']['Language']['_text'];
    }
    protected getFunder(element: any): Funder[] {
        return undefined;
    }
    protected getPubType(element: any): string {
        let pt = element['Article']['PublicationTypeList']['PublicationType'];
        if (Array.isArray(pt)) {
            let res = '';
            for (let e of pt) res += e['_text'] + ";"
            return res.slice(0, res.length - 1)
        } else return pt['_text'];
    }
    protected getOACategory(element: any): string {
        return undefined;
    }
    protected getContract(element: any): string {
        return undefined;
    }
    protected getLicense(element: any): string {
        return undefined;
    }
    protected getInvoiceInformation(element: any) {
        return undefined;
    }
    protected getStatus(element: any): number {
        return 1;
    }
    protected getAbstract(element: any): string {
        try {
            let pt = element['Article']['Abstract']['AbstractText']['_text'];
            if (Array.isArray(pt)) {
                let res = '';
                for (let e of pt) res += e + ";"
                return res.slice(0, res.length - 1)
            } else return pt;
        } catch (e) {return null};
    }
    protected getCitation(element: any): {volume?:string, issue?: string, first_page?: string, last_page?: string, publisher_location?: string, edition?: string, article_number?: string} {
        return null;
    }
    protected getPageCount(element: any): number {
        return null;
    }
    protected getPeerReviewed(element: any): boolean {
        return null;
    }
    protected getCostApproach(element: any): number {
        return null;
    }
}