import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { UpdateMapping, UpdateOptions } from '../../../../output-interfaces/Config';
import { Funder } from '../../funder/Funder.entity';
import { GreaterEntity } from '../../greater_entity/GreaterEntity.entity';
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
import { ApiImportOffsetService } from './api-import-offset.service';
import { ReportItemService } from '../report-item.service';
import { AppConfigService } from '../../config/app-config.service';

@Injectable()
export class CrossrefImportService extends ApiImportOffsetService {

    constructor(protected publicationService: PublicationService, protected authorService: AuthorService,
        protected geService: GreaterEntityService, protected funderService: FunderService, protected publicationTypeService: PublicationTypeService,
        protected publisherService: PublisherService, protected oaService: OACategoryService, protected contractService: ContractService,
        protected invoiceService: InvoiceService, protected reportService: ReportItemService, protected instService: InstituteService,
        protected languageService: LanguageService, protected roleService: RoleService, protected configService: AppConfigService,
        protected http: HttpService) {
        super(publicationService, authorService, geService, funderService, publicationTypeService, publisherService, oaService, contractService, invoiceService, reportService, instService, languageService, roleService, configService, http);

    }

    private searchText = '';
    private affiliation_tags = [];

    protected updateMapping: UpdateMapping = {
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
    };
    protected url = 'https://api.crossref.org/works?';
    protected max_res: number = 20;
    protected max_res_name = 'rows';
    protected offset_name = 'offset';
    protected offset_count = 0;
    protected offset_start = 0;
    protected params: { key: string, value: string }[] = [
        { key: 'query.affiliation', value: '' },
        { key: 'query.bibliographic', value: '' }];
    protected name = 'Crossref';
    protected parallelCalls = 1;

    async setReportingYear(year: string) {
        (await this.configService.get('search_tags')).forEach(tag => {
            this.searchText += tag + "+"
        })
        this.affiliation_tags = await this.configService.get('affiliation_tags')
        this.params = [
            { key: 'query.affiliation', value: this.searchText.slice(0, this.searchText.length - 1) },
            { key: 'query.bibliographic', value: year },
            { key: 'sort', value: 'indexed' }]//sorting avoids redundant publications in pages
    }
    
    protected importTest(element: any): boolean {
        return element && !(element['type'].includes('posted-content') || element['type'].includes('peer-review')) && this.authorsInstitution(element.author).length > 0;
    }

    protected getDOI(element: any): string {
        return element['DOI'];
    }
    protected getTitle(element: any): string {
        return element['title'] && element['title'].length > 0 ? element['title'][0] : null;
    }
    protected getNumber(response: any): number {
        return response.data.message['total-results'];
    }
    protected getData(response: any): any[] {
        return response.data.message.items;
    }
    protected getInstAuthors(element: any): { first_name: string, last_name: string, orcid?: string, affiliation?: string }[] {
        let authors_inst = this.authorsInstitution(element.author);
        let res = [];
        for (let item of authors_inst) res.push({ last_name: item['family'], first_name: item['given'], orcid: item['ORCID']?.slice(item['ORCID'].lastIndexOf('/') + 1), affiliation: item['affiliation'][0].name })
        return res;
    }
    protected getAuthors(element: any): string {
        let authors = element.author;
        if (!authors || authors.length === 0) authors = element.editor;
        let result = '';
        if (authors) {
            authors.forEach(author => {
                if (result !== '') {
                    result += '; ';
                }
                if (author.family) result += author.family + ', ' + author.given;
                else result += author.name;
            });
        }
        return result;
    }
    protected getGreaterEntity(element: any): GreaterEntity {
        let label = element['container-title'] && element['container-title'].length > 0 ? element['container-title'][0] : null;
        return {
            label,
            identifiers: element['ISSN']?.filter((v, i, s) => { return s.indexOf(v) === i; }).map(e => { return { type: 'issn', value: e }; })
        }
    }
    protected getPublisher(element: any): Publisher {
        return { label: element['publisher'] };
    }
    protected getPubDate(element: any) {
        let pub_date = null;
        let pub_date_print = null;
        let pub_date_accepted = null;
        if (element['published-online']) {
            pub_date = element['published-online']['date-parts'][0];
        } else if (element['published']) {
            pub_date = element['published']['date-parts'][0];
        }
        if (pub_date && pub_date.length === 3) pub_date = new Date(Date.UTC(pub_date[0], pub_date[1] - 1, pub_date[2]));
        else if (pub_date && pub_date.length === 2) pub_date = new Date(Date.UTC(pub_date[0], pub_date[1] - 1));
        else if (pub_date) pub_date = new Date(Date.UTC(pub_date[0], 0));

        if (element['published-print']) {
            pub_date_print = element['published-print']['date-parts'][0];
        }
        if (pub_date_print && pub_date_print.length === 3) pub_date_print = new Date(Date.UTC(pub_date_print[0], pub_date_print[1] - 1, pub_date_print[2]));
        else if (pub_date_print && pub_date_print.length === 2) pub_date_print = new Date(Date.UTC(pub_date_print[0], pub_date_print[1] - 1));
        else if (pub_date_print) pub_date_print = new Date(Date.UTC(pub_date_print[0], 0));

        if (element['approved']) {
            pub_date_accepted = element['approved']['date-parts'][0];
        } else if (element['accepted']) {
            pub_date_accepted = element['accepted']['date-parts'][0];
        }
        if (pub_date_accepted && pub_date_accepted.length === 3) pub_date_accepted = new Date(Date.UTC(pub_date_accepted[0], pub_date_accepted[1] - 1, pub_date_accepted[2]));
        else if (pub_date_accepted && pub_date_accepted.length === 2) pub_date_accepted = new Date(Date.UTC(pub_date_accepted[0], pub_date_accepted[1] - 1));
        else if (pub_date_accepted) pub_date_accepted = new Date(Date.UTC(pub_date_accepted[0], 0));


        return { pub_date, pub_date_print, pub_date_accepted };
    }
    protected getLanguage(element: any): string {
        return element['language'];
    }
    protected getLink(element: any): string {
        return element['URL'];
    }
    protected getFunder(element: any): Funder[] {
        return element['funder']?.map(f => { return { label: f.name, doi: f.DOI }; });
    }
    protected getPubType(element: any): string {
        return element['type'];
    }
    protected getOACategory(element: any): string {
        return null;
    }
    protected getContract(element: any): string {
        return null;
    }
    protected getLicense(element: any): string {
        if (!element['license']) return null;
        for (let item of element['license']) {
            if (item['content-version'] === 'vor') { //version of record
                if (item['URL'].includes('creativecommons.org/licenses/by/')) return 'cc-by'
                else if (item['URL'].includes('creativecommons.org/licenses/by-nc/')) return 'cc-by-nc'
                else if (item['URL'].includes('creativecommons.org/licenses/by-nc-nd/')) return 'cc-by-nc-nd'
                //else console.log(item['URL']);
            }
        }
        return null;
    }
    protected getInvoiceInformation(element: any) {
        return null;
    }
    protected getStatus(element: any): number {
        return 1;
    }

    public authorsInstitution(authors) {
        if (authors) {
            let aut = authors.filter(author => {
                author.affiliation = author.affiliation.filter(affiliation => this.affiliationIncludesTags(affiliation));
                return author.affiliation.length !== 0;
            });
            return aut;
        } else return [];
    }

    private async affiliationIncludesTags(affiliation) {
        for (let i = 0; i < this.affiliation_tags.length; i++) {
            if (affiliation.name?.toLowerCase().includes(this.affiliation_tags[i])) return true;
        }
        return false;
    }

    public publicationContainsInstitutionAuthor(publication): boolean {
        let authors = publication.author;
        if (!authors || authors.length === 0) authors = publication.editor;
        let res = this.authorsInstitution(authors).length !== 0;
        return res;
    }
    protected getAbstract(element: any): string {
        return element['abstract'];
    }
    protected getCitation(element: any): { volume?: string, issue?: string, first_page?: string, last_page?: string, publisher_location?: string, edition?: string, article_number?: string } {
        return null;
    }
    protected getPageCount(element: any): number {
        if (element['page'] && element['page'].split('-').length === 2) return Number(element['page'].split('-')[1]) - Number(element['page'].split('-')[0]) + 1
    }
    protected getPeerReviewed(element: any): boolean {
        return null;
    }
    protected getCostApproach(element: any): number {
        return null;
    }

}