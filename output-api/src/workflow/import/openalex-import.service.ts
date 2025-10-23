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
export class OpenAlexImportService extends ApiImportOffsetService {

    id: string;

    constructor(protected publicationService: PublicationService, protected authorService: AuthorService,
        protected geService: GreaterEntityService, protected funderService: FunderService, protected publicationTypeService: PublicationTypeService,
        protected publisherService: PublisherService, protected oaService: OACategoryService, protected contractService: ContractService,
        protected invoiceService: InvoiceService, protected reportService: ReportItemService, protected instService: InstituteService, 
        protected languageService: LanguageService,  protected roleService: RoleService, protected configService: AppConfigService,
        protected http: HttpService) {
        super(publicationService, authorService, geService, funderService, publicationTypeService, publisherService, oaService, contractService, invoiceService, reportService, instService, languageService, roleService, configService, http);
        
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
        status: UpdateOptions.REPLACE_IF_EMPTY,
        abstract: UpdateOptions.IGNORE,
        citation: UpdateOptions.REPLACE_IF_EMPTY,
        page_count: UpdateOptions.REPLACE_IF_EMPTY,
        peer_reviewed: UpdateOptions.IGNORE,
        cost_approach: UpdateOptions.REPLACE_IF_EMPTY,
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

    async setReportingYear(year: string) {
        this.id = await this.configService.get('openalex_id')
        let tmp =   `publication_year:${year}`;
        tmp = tmp+=`,institutions.id:${this.id}`
        this.params = [
            { key: 'filter', value: tmp }]
    }
    protected getNumber(response: any): number {
        return response.data.meta['count'];
    }
    protected importTest(element: any): boolean {
        return true;//element['primary_location']['is_published'];
    }
    protected getData(response: any): any[] {
        return response.data.results;
    }

    protected getDOI(element: any): string {
        let res = element['doi']
        if (res?.includes('doi.org/')) {
            res = res.slice(res.indexOf('doi.org/') + 8)
        }
        return res;
    }
    protected getTitle(element: any): string {
        return element['title'];
    }
    protected getInstAuthors(element: any): { first_name: string, last_name: string, orcid?: string, affiliation?: string, corresponding?: boolean }[] {
        let res = [];
        let authors = element['authorships'];
        for (let aut of authors) {
            if (aut['institutions'].find(e => e['id']?.includes(this.id))) {
                let name = aut['author']['display_name']
                res.push({
                    first_name: name.slice(0, name.lastIndexOf(' ')),
                    last_name: name.slice(name.lastIndexOf(' ') + 1),
                    orcid: aut['author']['orcid'] ? aut['author']['orcid'].slice(aut['author']['orcid'].lastIndexOf('/') + 1) : undefined,
                    affiliation: aut['raw_affiliation_strings'].reduce((a, v, i) => a + '; ' + v),
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
        return res.slice(0, res.length - 2);
    }
    protected getGreaterEntity(element: any): GreaterEntity {
        return {
            label: element['primary_location']['source'] ? element['primary_location']['source']['display_name'] : undefined,
            identifiers: element['primary_location']['source'] && element['primary_location']['source']['type']?.includes('journal') ? element['primary_location']['source']['issn']?.map(e => {
                return {
                    type: 'issn',
                    value: e
                }
            }) : undefined
        }
    }
    protected getPublisher(element: any): Publisher {
        return element['primary_location']['source'] ? { label: element['primary_location']['source']['host_organization_name'] } : null;
    }
    protected getPubDate(element: any): Date {
        let data = null;
        if (element['publication_date']) {
            data = element['publication_date'];
        } else if (element['publication_year']) {
            data = element['publication_year'] + '-01-01';
        }
        let pubdate = data.split('-');
        if (pubdate.length === 3) return new Date(Date.UTC(pubdate[0], pubdate[1] - 1, pubdate[2]));
        else return new Date(Date.UTC(pubdate[0], 0));
    }
    protected getLanguage(element: any): string {
        return element['language'];
    }
    protected getLink(element: any): string {
        return element['primary_location']['landing_page_url'];
    }
    protected getFunder(element: any): Funder[] {
        if (element['grants']) {
            return element['grants'].map(e => {
                return {
                    label: e['funder_display_name']
                }
            })
        }
    }
    protected getPubType(element: any): string {
        let type = element['type'];
        if (type === 'article') {
            if (element['primary_location']['source'] && element['primary_location']['source']['type'] === 'conference') return 'conference proceedings'
        }
        return type;
    }
    protected getOACategory(element: any): string {
        let status = element['open_access']['oa_status']
        if (status === 'gold' && element['apc_list'] && element['apc_list']['value'] === 0) return 'diamond';
        return status;
    }
    protected getContract(element: any): string {
        return null;
    }
    protected getLicense(element: any): string {
        return element['license'];
    }
    protected getInvoiceInformation(element: any) {
        return null;
    }
    protected getStatus(element: any): number {
        return 1;
    }
    protected getAbstract(element: any): string {
        return null;
    }
    protected getCitation(element: any): {volume?:string, issue?: string, first_page?: string, last_page?: string, publisher_location?: string, edition?: string, article_number?: string} {
        if (element['biblio']) {
            let e = {
                volume: element['biblio']['volume'],
                issue: element['biblio']['issue'],
                first_page: element['biblio']['first_page'],
                last_page: element['biblio']['last_page'],
            }
            return e;
        } else return null;
    }
    protected getPageCount(element: any): number {
        try {
            let count = Number(element['biblio']['last_page']) - Number(element['biblio']['first_page']) + 1;
            if (!Number.isNaN(count) && count < 999999) return count;
            else return null;
        } catch (e) { return null; }
    }
    protected getPeerReviewed(element: any): boolean {
        return null;
    }
    protected getCostApproach(element: any): number {
        let elem = element['apc_paid'] ? element['apc_paid'] : element['apc_list'];
        if (elem) {
            if (elem['currency'] != 'EUR') {
                //return element['apc_paid']['currency'] + " " + element['apc_paid']['value']
                return null;
            } else return Number(element['apc_paid']['value'])
        }
        return null;
    }
}