import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UpdateMapping, UpdateOptions } from '../../../../output-interfaces/Config';
import { Funder } from '../../entity/Funder';
import { Identifier } from '../../entity/Identifier';
import { AuthorService } from '../entities/author.service';
import { ContractService } from '../entities/contract.service';
import { CostTypeService } from '../entities/cost-type.service';
import { FunderService } from '../entities/funder.service';
import { GreaterEntityService } from '../entities/greater-entitiy.service';
import { InstitutionService } from '../entities/institution.service';
import { LanguageService } from '../entities/language.service';
import { OACategoryService } from '../entities/oa-category.service';
import { PublicationTypeService } from '../entities/publication-type.service';
import { PublicationService } from '../entities/publication.service';
import { PublisherService } from '../entities/publisher.service';
import { ReportItemService } from '../report-item.service';
import { ApiEnrichDOIService } from './api-enrich-doi.service';
import { Publisher } from '../../entity/Publisher';
import { GreaterEntity } from '../../entity/GreaterEntity';

@Injectable()
export class CrossrefEnrichService extends ApiEnrichDOIService {

    constructor(protected publicationService: PublicationService, protected authorService: AuthorService,
        protected geService: GreaterEntityService, protected funderService: FunderService, protected publicationTypeService: PublicationTypeService,
        protected publisherService: PublisherService, protected oaService: OACategoryService, protected contractService: ContractService,
        protected costTypeService: CostTypeService, protected reportService: ReportItemService, protected instService:InstitutionService, protected languageService:LanguageService, protected configService: ConfigService,
        protected http: HttpService) {
        super(publicationService, authorService, geService, funderService, publicationTypeService, publisherService, oaService, contractService, costTypeService, reportService,instService, languageService, configService, http);
        this.configService.get('searchTags').forEach(tag => {
            this.searchText += tag + "+"
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
        editors :UpdateOptions.IGNORE,
        abstract :UpdateOptions.REPLACE_IF_EMPTY,
        citation :UpdateOptions.IGNORE,
        page_count :UpdateOptions.REPLACE_IF_EMPTY,
        peer_reviewed :UpdateOptions.IGNORE,
    };
    protected url = 'https://api.crossref.org/works/';
    protected param_string = '';
    protected name = 'Crossref';
    protected parallelCalls = 10;

    protected importTest(element: any): boolean {
        return element;
    }

    protected getDOI(element: any): string {
        return element['DOI'];
    }
    protected getTitle(element: any): string {
        return element['title'] && element['title'].length > 0 ? element['title'][0] : null;
    }
    protected getNumber(response: any): number {
        return response ? 1 : 0;
    }
    protected getData(response: any): any[] {
        return response.data.message;
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
        return {label: element['publisher']};
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
        if (pub_date && pub_date.length === 3) pub_date = new Date(Date.UTC(pub_date[0], pub_date[1]-1, pub_date[2]));
        else if (pub_date && pub_date.length === 2) pub_date = new Date(Date.UTC(pub_date[0], pub_date[1]-1));
        else if (pub_date) pub_date = new Date(Date.UTC(pub_date[0], 0));

        if (element['published-print']) {
            pub_date_print = element['published-print']['date-parts'][0];
        } 
        if (pub_date_print && pub_date_print.length === 3) pub_date_print = new Date(Date.UTC(pub_date_print[0], pub_date_print[1]-1, pub_date_print[2]));
        else if (pub_date_print && pub_date_print.length === 2) pub_date_print = new Date(Date.UTC(pub_date_print[0], pub_date_print[1]-1));
        else if (pub_date_print) pub_date_print = new Date(Date.UTC(pub_date_print[0], 0));

        if (element['approved']) {
            pub_date_accepted = element['approved']['date-parts'][0];
        } else if (element['accepted']) {
            pub_date_accepted = element['accepted']['date-parts'][0];
        }
        if (pub_date_accepted && pub_date_accepted.length === 3) pub_date_accepted = new Date(Date.UTC(pub_date_accepted[0], pub_date_accepted[1]-1, pub_date_accepted[2]));
        else if (pub_date_accepted && pub_date_accepted.length === 2) pub_date_accepted = new Date(Date.UTC(pub_date_accepted[0], pub_date_accepted[1]-1));
        else if (pub_date_accepted) pub_date_accepted = new Date(Date.UTC(pub_date_accepted[0], 0));


        return {pub_date, pub_date_print, pub_date_accepted};
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

    private affiliationIncludesTags(affiliation): boolean {
        for (let i = 0; i < this.configService.get('affiliationTags').length; i++) {
            if (affiliation.name?.toLowerCase().includes(this.configService.get('affiliationTags')[i])) return true;
        }
        return false;
    }

    public publicationContainsInstitutionAuthor(publication): boolean {
        let authors = publication.author;
        if (!authors || authors.length === 0) authors = publication.editor;
        let res = this.authorsInstitution(authors).length !== 0;
        return res;
    }
    protected getEditors(element: any): string {
        return null;
    }
    protected getAbstract(element: any): string {
        return element['abstract'];
    }
    protected getCitation(element: any): { volume: number, issue: number, first_page: number, last_page: number } {
        return null;
    }
    protected getPageCount(element: any): number {
        if (element['page'] && element['page'].split('-').length === 2) return Number(element['page'].split('-')[1])-Number(element['page'].split('-')[0])+1
    }
    protected getPeerReviewed(element: any): boolean {
        return null;
    }

}