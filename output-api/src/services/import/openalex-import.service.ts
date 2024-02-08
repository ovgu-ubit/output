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
export class OpenAlexImportService extends ApiImportOffsetService {

    id:string;

    constructor(protected publicationService: PublicationService, protected authorService: AuthorService,
        protected geService: GreaterEntityService, protected funderService: FunderService, protected publicationTypeService: PublicationTypeService,
        protected publisherService: PublisherService, protected oaService: OACategoryService, protected contractService: ContractService,
        protected costTypeService: CostTypeService, protected reportService: ReportItemService, protected instService:InstitutionService, protected languageService:LanguageService,
        protected http: HttpService, private configService: ConfigService) {
        super(publicationService, authorService, geService, funderService, publicationTypeService, publisherService, oaService, contractService, costTypeService, reportService,instService, languageService, http);
        this.id = this.configService.get('openalex_id')
    }

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
    protected url = 'https://api.openalex.org/works?';
    protected max_res: number = 1;
    protected max_res_name = 'per-page';
    protected offset_name = 'page';
    protected offset_count = 1;
    protected offset_start = 1;
    protected params: { key: string, value: string }[] = [
        { key: 'filter', value: `publication_year:2023,institutions.id:` }];
    protected name = 'OpenAlex';
    protected parallelCalls = 1;

    setReportingYear(year: string) {
        this.params = [
            { key: 'filter', value: `publication_year:${year},institutions.id:${this.id}` }]
    }
    protected getNumber(response: any): number {
        return response.data.meta['count'];
    }
    protected importTest(element: any): boolean {
        return element;
    }
    protected getData(response: any): any[] {
        return response.data.results;
    }

    protected getDOI(element: any): string {
        return element['doi'];
    }
    protected getTitle(element: any): string {
        return element['title'];
    }
    protected getInstAuthors(element: any): { first_name: string, last_name: string, orcid?: string, affiliation?: string, corresponding?: boolean }[] {
        let res = [];
        let authors = element['authorships'];
        for (let aut of authors) {
            if (aut['institutions'].find(e => e['id'].includes(this.id))) {
                let name = aut['author']['display_name']
                res.push({
                    first_name: name.slice(0, name.lastIndexOf(' ')),
                    last_name: name.slice(name.lastIndexOf(' ')+1),
                    orcid: aut['author']['orcid'].slice(aut['author']['orcid'].lastIndexOf('/')+1),
                    affiliation: aut['raw_affiliation_string'],
                    corresponding: aut['is_corresponding']
                })
            }
        }
        return res;
    }
    protected getAuthors(element: any): string {
        let res = '';
        let authors = element['authorships'];
        for (let aut of authors) {
            res += aut['author']['display_name'] + '; '
        }
        return res.slice(0,res.length-2);
    }
    protected getGreaterEntityIdentifier(element: any): Identifier[] {
        if (element['primary_location']['source']['type'].includes('journal')) {
            return element['primary_location']['source']['issn'].map(e => {return {
                type: 'issn',
                value: e
            }})
        } 
    }
    protected getGreaterEntityName(element: any): string {
        return element['primary_location']['source']['display_name'];
    }
    protected getPublisher(element: any): string {
        return element['primary_location']['source']['host_organization_name'];
    }
    protected getPubDate(element: any): Date {
        let data = null;
        if (element['publication_date']) {
            data = element['publication_date'];
        } else if (element['publication_year']) {
            data = element['publication_year']+'-01-01';
        } 
        let pubdate = data.split('-');
        if (data.length === 3) pubdate = new Date(Date.UTC(data[0], data[1]-1, data[2]));
        else pubdate = new Date(Date.UTC(data[0], 0));

        return pubdate;
    }
    protected getLanguage(element: any): string {
        return element['language'];
    }
    protected getLink(element: any): string {
        return element['primary_location']['landing_page_url'];
    }
    protected getFunder(element: any): Funder[] {
        return [];
    }
    protected getPubType(element: any): string {
        return element['type'];
    }
    protected getOACategory(element: any): string {
        return element['open_access']['oa_status'];
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