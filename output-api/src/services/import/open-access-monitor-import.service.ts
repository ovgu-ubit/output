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
import { Identifier } from '../../entity/Identifier';
import { UpdateMapping, UpdateOptions } from '../../../../output-interfaces/Config';
import { OACategoryService } from '../entities/oa-category.service';
import { ContractService } from '../entities/contract.service';
import { ApiEnrichDOIService } from './api-enrich-doi.service';
import { FindManyOptions } from 'typeorm';
import { CostTypeService } from '../entities/cost-type.service';
import { ReportItemService } from '../report-item.service';
import { InstitutionService } from '../entities/institution.service';
import { LanguageService } from '../entities/language.service';
import { ApiImportOffsetService } from './api-import-offset.service';
import { Publisher } from '../../entity/Publisher';
import { GreaterEntity } from '../../entity/GreaterEntity';

@Injectable()
export class OpenAccessMonitorImportService extends ApiImportOffsetService {

    constructor(protected publicationService: PublicationService, protected authorService: AuthorService,
        protected geService: GreaterEntityService, protected funderService: FunderService, protected publicationTypeService: PublicationTypeService,
        protected publisherService: PublisherService, protected oaService: OACategoryService, protected contractService: ContractService,
        protected costTypeService: CostTypeService, protected reportService: ReportItemService, protected instService:InstitutionService,protected languageService:LanguageService, protected configService: ConfigService, protected http: HttpService,
        ) {
        super(publicationService, authorService, geService, funderService, publicationTypeService, publisherService, oaService, contractService, costTypeService, reportService,instService, languageService, configService, http);
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
        editors :UpdateOptions.IGNORE,
        abstract :UpdateOptions.IGNORE,
        citation :UpdateOptions.IGNORE,
        page_count :UpdateOptions.IGNORE,
        peer_reviewed :UpdateOptions.IGNORE,
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

    protected retrieveCountRequest() {
         return this.http.get(`${this.url}token=${this.configService.get('api_key_oam')}&query={count:"Publications", query:{year:${this.year}, "source_data.organisations._id":"${this.configService.get('ror_id')}"}}`)
    }

    protected request(offset:number) {
        return this.http.get(`${this.url}token=${this.configService.get('api_key_oam')}&query={find:"Publications", filter:{year:${this.year}, "source_data.organisations._id":"${this.configService.get('ror_id')}"}, limit: ${this.max_res}, skip: ${offset}}`)
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
        return element['published_date'];
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
    protected getEditors(element: any): string {
        return null;
    }
    protected getAbstract(element: any): string {
        return null;
    }
    protected getCitation(element: any): string {
        return null;
    }
    protected getPageCount(element: any): number {
        return null;
    }
    protected getPeerReviewed(element: any): boolean {
        return null;
    }
}