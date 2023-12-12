import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Author } from '../../entity/Author';
import { Funder } from '../../entity/Funder';
import { Publication } from '../../entity/Publication';
import { AuthorService } from '../entities/author.service';
import { FunderService } from '../entities/funder.service';
import { GreaterEntityService } from '../entities/greater-entitiy.service';
import { PublicationTypeService } from '../entities/publication-type.service';
import { PublicationService } from '../entities/publication.service';
import { PublisherService } from '../entities/publisher.service';
import { ApiImportOffsetService } from './api-import-offset.service';
import { Identifier } from '../../entity/Identifier';
import { UpdateMapping, UpdateOptions } from '../../../../output-interfaces/Config';
import { OACategoryService } from '../entities/oa-category.service';
import { ContractService } from '../entities/contract.service';
import { CostTypeService } from '../entities/cost-type.service';
import { ReportItemService } from '../report-item.service';
import { InstitutionService } from '../entities/institution.service';
import { LanguageService } from '../entities/language.service';

@Injectable()
export class CrossrefImportService extends ApiImportOffsetService {

    constructor(protected publicationService: PublicationService, protected authorService: AuthorService,
        protected geService: GreaterEntityService, protected funderService: FunderService, protected publicationTypeService: PublicationTypeService,
        protected publisherService: PublisherService, protected oaService: OACategoryService, protected contractService: ContractService,
        protected costTypeService: CostTypeService, protected reportService: ReportItemService, protected instService:InstitutionService, protected languageService:LanguageService,
        protected http: HttpService, private configService: ConfigService) {
        super(publicationService, authorService, geService, funderService, publicationTypeService, publisherService, oaService, contractService, costTypeService, reportService,instService, languageService, http);
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
        status: UpdateOptions.IGNORE,
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

    setReportingYear(year: string) {
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
    protected getGreaterEntityIdentifier(element: any): Identifier[] {
        return element['ISSN']?.filter((v, i, s) => { return s.indexOf(v) === i; }).map(e => { return { type: 'issn', value: e }; });
    }
    protected getGreaterEntityName(element: any): string {
        return element['container-title'] && element['container-title'].length > 0 ? element['container-title'][0] : null;
    }
    protected getPublisher(element: any): string {
        return element['publisher'];
    }
    protected getPubDate(element: any): Date {
        let data = null;
        if (element['published-online']) {
            data = element['published-online']['date-parts'][0];
        } else if (element['published-print']) {
            data = element['published-print']['date-parts'][0];
        } else if (element['published']) {
            data = element['published']['date-parts'][0];
        }
        let pubdate = null;
        if (data.length === 3) pubdate = new Date(Date.UTC(data[0], data[1]-1, data[2]));
        else if (data.length === 2) pubdate = new Date(Date.UTC(data[0], data[1]-1));
        else pubdate = new Date(Date.UTC(data[0], 0));

        return pubdate;
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
        return [];
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


}