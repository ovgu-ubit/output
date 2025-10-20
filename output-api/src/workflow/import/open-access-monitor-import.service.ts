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
import { ReportItemService } from '../report-item.service';
import { AppConfigService } from '../../config/app-config.service';

@Injectable()
export class OpenAccessMonitorImportService extends ApiImportOffsetService {

    constructor(protected publicationService: PublicationService, protected authorService: AuthorService,
        protected geService: GreaterEntityService, protected funderService: FunderService, protected publicationTypeService: PublicationTypeService,
        protected publisherService: PublisherService, protected oaService: OACategoryService, protected contractService: ContractService,
        protected invoiceService: InvoiceService, protected reportService: ReportItemService, protected instService:InstituteService,
        protected languageService:LanguageService,  protected roleService: RoleService, protected configService: AppConfigService, protected http: HttpService,
        ) {
        super(publicationService, authorService, geService, funderService, publicationTypeService, publisherService, oaService, contractService, invoiceService, reportService,instService, languageService, roleService, configService, http);
    }

    protected updateMapping: UpdateMapping = {
        author_inst: UpdateOptions.IGNORE,
        authors: UpdateOptions.IGNORE,
        title: UpdateOptions.IGNORE,
        pub_type: UpdateOptions.IGNORE,
        oa_category: UpdateOptions.REPLACE_IF_EMPTY,
        greater_entity: UpdateOptions.REPLACE_IF_EMPTY,
        publisher: UpdateOptions.IGNORE,
        contract: UpdateOptions.IGNORE,
        funder: UpdateOptions.IGNORE,
        doi: UpdateOptions.IGNORE,
        pub_date: UpdateOptions.IGNORE,
        link: UpdateOptions.IGNORE,
        language: UpdateOptions.IGNORE,
        license: UpdateOptions.REPLACE_IF_EMPTY,
        invoice: UpdateOptions.IGNORE,
        status: UpdateOptions.IGNORE,
        abstract :UpdateOptions.IGNORE,
        citation :UpdateOptions.IGNORE,
        page_count :UpdateOptions.IGNORE,
        peer_reviewed :UpdateOptions.IGNORE,
        cost_approach: UpdateOptions.REPLACE_IF_EMPTY,
    };
    protected url = 'https://open-access-monitor.de/api/Data/public?';
    protected max_res: number = 100;
    protected max_res_name = 'limit';
    protected offset_name = 'skip';
    protected offset_count = 0;
    protected offset_start = 0;
    year='2022';
    protected name = 'Open-Access-Monitor';
    protected parallelCalls = 1;

    setReportingYear(year: string) {
        this.year = year;
    }

    param_string;
    ror_id;

    protected async init() {
        this.param_string = 'token=' + await this.configService.get('api_key_oam');
        this.ror_id = await this.configService.get('ror_id');
    }

    protected retrieveCountRequest() {
         return this.http.get(`${this.url}token=${this.param_string}&query={count:"Publications", query:{year:${this.year}, "source_data.organisations._id":"${this.ror_id}"}}`)
    }

    protected request(offset:number) {
        return this.http.get(`${this.url}token=${this.param_string}&query={find:"Publications", filter:{year:${this.year}, "source_data.organisations._id":"${this.ror_id}"}, limit: ${this.max_res}, skip: ${offset}}`)
    }

    protected importTest(element: any): boolean {
        return element;
    }
    protected getDOI(element: any): string {
        return element['doi'];
    }
    protected getTitle(element: any): string {
        return '';
    }
    protected getNumber(response: any): number {
        return response ? response.data.n : 0;
    }
    protected getData(response: any): any[] {
        return response.data.cursor.batch;
    }
    protected getInstAuthors(element: any): { first_name: string, last_name: string, orcid?: string, affiliation?: string }[] {
        return null;
    }
    protected getAuthors(element: any): string {
        return '';
    }
    protected getGreaterEntity(element: any): GreaterEntity {
        return { 
            label: element['journal']['title'],
            identifiers: element['journal']['issns'].map(e => {return {type:'issn', value:e}})
        }
    }
    protected getPublisher(element: any): Publisher {
        return {label: element['publisher']['name']};
    }
    protected getPubDate(element: any): Date {
        let string =  element['published_date'];
        try {
            let dates = string.split('-');
            return new Date(Date.UTC(dates[0],dates[1]-1,dates[2]));
        } catch (err) {
            return new Date(Date.UTC(Number(this.year),0,1));
        }
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
        return null;
    }
    protected getOACategory(element: any): string {
        switch(element['oa_color']) {
            case 0:
                return 'Closed';
            case 1:
                return 'Bronze';
            case 3:
            case 4:
            case 5:
                return 'Green';
            case 6:
                return 'Hybrid';
            case 7:
                return 'Gold';
            case 8:
                return 'Diamond';
            default:
                return null;
        }
    }
    protected getContract(element: any): string {
        return null;
    }
    protected getLicense(element: any): string {
        return element['license']
    }
    protected getInvoiceInformation(element: any) {
        return null;
    }
    protected getStatus(element: any): number {
        return 0;
    }
    protected getAbstract(element: any): string {
        return null;
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