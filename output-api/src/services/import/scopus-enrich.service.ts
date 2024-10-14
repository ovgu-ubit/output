import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Funder } from '../../entity/Funder';
import { AuthorService } from '../entities/author.service';
import { FunderService } from '../entities/funder.service';
import { GreaterEntityService } from '../entities/greater-entitiy.service';
import { PublicationTypeService } from '../entities/publication-type.service';
import { PublicationService } from '../entities/publication.service';
import { PublisherService } from '../entities/publisher.service';
import { UpdateMapping, UpdateOptions } from '../../../../output-interfaces/Config';
import { OACategoryService } from '../entities/oa-category.service';
import { ContractService } from '../entities/contract.service';
import { CostTypeService } from '../entities/cost-type.service';
import { ReportItemService } from '../report-item.service';
import { InstitutionService } from '../entities/institution.service';
import { LanguageService } from '../entities/language.service';
import { Publisher } from '../../entity/Publisher';
import { GreaterEntity } from '../../entity/GreaterEntity';
import { ApiEnrichDOIService } from './api-enrich-doi.service';
import { RoleService } from '../entities/role.service';

@Injectable()
export class ScopusEnrichService extends ApiEnrichDOIService {

    constructor(protected publicationService: PublicationService, protected authorService: AuthorService,
        protected geService: GreaterEntityService, protected funderService: FunderService, protected publicationTypeService: PublicationTypeService,
        protected publisherService: PublisherService, protected oaService: OACategoryService, protected contractService: ContractService,
        protected costTypeService: CostTypeService, protected reportService: ReportItemService, protected instService: InstitutionService, protected languageService: LanguageService, 
        protected roleService:RoleService, protected configService: ConfigService,
        protected http: HttpService) {
        super(publicationService, authorService, geService, funderService, publicationTypeService, publisherService, oaService, contractService, costTypeService, reportService, instService, languageService, roleService, configService, http);
        this.configService.get('searchTags').forEach(tag => {
            this.searchText += tag + " or "
        })
    }

    private searchText = '';

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
    };
    protected url = 'https://api.elsevier.com/content/search/scopus?';
    protected max_res: number = 20;
    protected max_res_name = 'count';
    protected offset_name = 'start';
    protected offset_count = 0;
    protected offset_start = 0;
    protected name = 'Scopus';
    protected parallelCalls = 1;

    protected createUrl(doi: string) {
        return `${this.url}?count=1&view=complete&apiKey=${this.configService.get('api_key_scopus')}&query=DOI(${doi})`;
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
        return response.data['search-results']['entry'][0];
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
    private affiliationTagMatch(affiliation: string): boolean {
        for (let i = 0; i < this.configService.get('affiliationTags').length; i++) {
            if (affiliation.toLowerCase().includes(this.configService.get('affiliationTags')[i])) return true;
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

    protected getEditors(element: any): string {
        return null;
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

}