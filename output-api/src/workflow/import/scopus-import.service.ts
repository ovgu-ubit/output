import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { UpdateMapping, UpdateOptions } from '../../../../output-interfaces/Config';
import { Funder } from '../../funder/Funder';
import { GreaterEntity } from '../../greater_entity/GreaterEntity';
import { Publisher } from '../../publisher/Publisher';
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
import { AppConfigService } from '../../config/app-config.service';
import { ReportItemService } from '../report-item.service';

@Injectable()
export class ScopusImportService extends ApiImportOffsetService {

    constructor(protected publicationService: PublicationService, protected authorService: AuthorService,
        protected geService: GreaterEntityService, protected funderService: FunderService, protected publicationTypeService: PublicationTypeService,
        protected publisherService: PublisherService, protected oaService: OACategoryService, protected contractService: ContractService,
        protected invoiceService: InvoiceService, protected reportService: ReportItemService, protected instService: InstituteService, protected languageService: LanguageService, 
        protected roleService:RoleService, protected configService: AppConfigService,
        protected http: HttpService) {
        super(publicationService, authorService, geService, funderService, publicationTypeService, publisherService, oaService, contractService, invoiceService, reportService, instService, languageService, roleService, configService, http);
    }

    private searchText = '';
    private affiliationTags;

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
        abstract :UpdateOptions.REPLACE_IF_EMPTY,
        citation :UpdateOptions.IGNORE,
        page_count :UpdateOptions.REPLACE_IF_EMPTY,
        peer_reviewed :UpdateOptions.IGNORE,
        cost_approach: UpdateOptions.REPLACE_IF_EMPTY,
    };
    protected url = 'https://api.elsevier.com/content/search/scopus?';
    protected max_res: number = 20;
    protected max_res_name = 'count';
    protected offset_name = 'start';
    protected offset_count = 0;
    protected offset_start = 0;
    protected params: { key: string, value: string }[] = [
        { key: 'query.affiliation', value: '' },
        { key: 'query.bibliographic', value: '' }];
    protected name = 'Scopus';
    protected parallelCalls = 1;

    async setReportingYear(year: string) {
        (await this.configService.get('searchTags')).forEach(tag => {
            this.searchText += tag + " or "
        })
        this.affiliationTags = await this.configService.get('affiliationTags');
        this.params = [
            { key: 'query', value: 'AFFIL(' + this.searchText.slice(0, this.searchText.length - 4) + ')+and+PUBYEAR+IS+' + year },
            { key: 'view', value: 'complete' },
            { key: 'apiKey', value: await this.configService.get('api_key_scopus') }]
    }
    protected importTest(element: any): boolean {
        return element && element.affiliation && this.affiliationIncludesTags(element.affiliation)
    }

    protected getDOI(element: any): string {
        return element['prism:doi'];
    }
    protected getTitle(element: any): string {
        return element['dc:title'];
    }
    protected getNumber(response: any): number {
        return response.data['search-results']['opensearch:totalResults'];
    }
    protected getData(response: any): any[] {
        return response.data['search-results']['entry'];
    }
    protected getInstAuthors(element: any): { first_name: string, last_name: string, orcid?: string, affiliation?: string }[] {
        if (!element.author || element.author.length === 0) return null;
        let aut_inst = [];
        for (let i = 0; i < element.author.length; i++) {
            let aff = element.affiliation.filter(e => element.author[i].afid?.find(f => f['$'] === e.afid))
            if (!aff || !Array.isArray(aff)) continue;
            if (this.affiliationIncludesTags(aff)) aut_inst.push(element.author[i])
        }
        let res = [];
        for (let item of aut_inst) res.push({ last_name: item['surname'], first_name: item['given-name'] })
        return res;
    }
    private affiliationIncludesTags(affiliation: any[]): boolean {
        for (let aff of affiliation) {
            if (this.affiliationTagMatch(aff.affilname)) return true;
        }
        return false;
    }
    private async affiliationTagMatch(affiliation: string) {
        for (let i = 0; i < this.affiliationTags.length; i++) {
            if (affiliation.toLowerCase().includes((await this.configService.get('affiliationTags'))[i])) return true;
        }
        return false;
    }
    protected getAuthors(element: any): string {
        let authors = element.author;
        if (!authors || authors.length === 0) return null;
        let result = '';
        authors.forEach(author => {
            if (result !== '') {
                result += '; ';
            }
            if (author.surname) result += author.surname + ', ' + author['given-name'];
            else result += author.authname;
        });
        return result;
    }

    protected getGreaterEntity(element: any): GreaterEntity {
        let identifiers = [];
        if (element['prism:isbn']) identifiers = identifiers.concat(element['prism:isbn'].map(e => { return { type: 'isbn', value: e['$'] } }));
        if (element['prism:eIssn']) identifiers.push({ type: 'issn', value: element['prism:eIssn'].slice(0, 4) + '-' + element['prism:eIssn'].slice(4) });
        if (element['prism:issn']) identifiers.push({ type: 'issn', value: element['prism:issn'].slice(0, 4) + '-' + element['prism:issn'].slice(4) });
        return {
            label: element['prism:publicationName'],
            identifiers
        };
    }
    protected getPublisher(element: any): Publisher {
        return null;
    }
    protected getPubDate(element: any) {
        let split = element['prism:coverDate'].split('-');
        return new Date(Date.UTC(split[0], split[1] - 1, split[2]));
    }
    protected getLanguage(element: any): string {
        return null;
    }
    protected getLink(element: any): string {
        return null;
    }
    protected getFunder(element: any): Funder[] {
        return null;
    }
    protected getPubType(element: any): string {
        return element['subtypeDescription'];
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
    protected getInvoiceInformation(element: any) {
        return [];
    }
    protected getStatus(element: any): number {
        return 1;
    }
    protected getAbstract(element: any): string {
        return element['dc:description'];
    }
    protected getCitation(element: any): {volume?:string, issue?: string, first_page?: string, last_page?: string, publisher_location?: string, edition?: string, article_number?: string} {
        let volume, issue,first_page,last_page,article_number;
        volume = element['prism:volume']
        issue = element['prism:issueIdentifier']
        article_number = element['article_number']
        try {
            let range = element['prism:pageRange']
            let split = range.split('-');
            first_page = split[0]
            last_page = split[1]
        } catch (err) {first_page = element['prism:pageRange'];last_page = null;}
        return {volume, issue, first_page, last_page, article_number};
    }
    protected getPageCount(element: any): number {
        try {
            let range = element['prism:pageRange']
            let split = range.split('-');
            let res = Number(split[1]) - Number(split[0]) + 1;
            if (!Number.isNaN(res) && res <= 2147483647) return res; else return null;//max int
        } catch (err) {
            return null;
        }
    }
    protected getPeerReviewed(element: any): boolean {
        return null;
    }
    protected getCostApproach(element: any): number {
        return null;
    }

}