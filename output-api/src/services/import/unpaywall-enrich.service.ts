import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UpdateMapping, UpdateOptions } from '../../../../output-interfaces/Config';
import { Publication } from '../../publication/Publication';
import { Publisher } from '../../entity/Publisher';
import { AuthorService } from '../../author/author.service';
import { ContractService } from '../../contract/contract.service';
import { GreaterEntityService } from '../../greater_entity/greater-entitiy.service';
import { InstitutionService } from '../../institute/institution.service';
import { InvoiceService } from '../entities/invoice.service';
import { LanguageService } from '../entities/language.service';
import { OACategoryService } from '../entities/oa-category.service';
import { PublicationTypeService } from '../entities/publication-type.service';
import { PublicationService } from '../../publication/publication.service';
import { PublisherService } from '../entities/publisher.service';
import { RoleService } from '../entities/role.service';
import { ReportItemService } from '../report-item.service';
import { ApiEnrichDOIService } from './api-enrich-doi.service';
import { FunderService } from '../../funder/funder.service';
import { Funder } from '../../funder/Funder';
import { GreaterEntity } from '../../greater_entity/GreaterEntity';

@Injectable()
export class UnpaywallEnrichService extends ApiEnrichDOIService {

    constructor(protected publicationService: PublicationService, protected authorService: AuthorService,
        protected geService: GreaterEntityService, protected funderService: FunderService, protected publicationTypeService: PublicationTypeService,
        protected publisherService: PublisherService, protected oaService: OACategoryService, protected contractService: ContractService,
        protected invoiceService: InvoiceService, protected reportService: ReportItemService, protected instService:InstitutionService,protected languageService:LanguageService,  
        protected roleService: RoleService, protected configService: ConfigService, protected http: HttpService,
        ) {
        super(publicationService, authorService, geService, funderService, publicationTypeService, publisherService, oaService, contractService, invoiceService, reportService,instService, languageService, roleService, configService, http);
            this.param_string = 'email='+this.configService.get('api_key_unpaywall');
    }

    protected updateMapping: UpdateMapping = {
        author_inst: UpdateOptions.IGNORE,
        authors: UpdateOptions.IGNORE,
        title: UpdateOptions.IGNORE,
        pub_type: UpdateOptions.IGNORE,
        oa_category: UpdateOptions.REPLACE_IF_EMPTY,
        greater_entity: UpdateOptions.IGNORE,
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
    protected url = 'https://api.unpaywall.org/v2/';
    protected name = 'Unpaywall';
    protected parallelCalls = 10;

    protected importTest(element: any): boolean {
        return element;
    }
    protected getDOI(element: any): string {
        return element['doi'];
    }
    protected getTitle(element: any): string {
        return element['title'];
    }
    protected getNumber(response: any): number {
        return response ? 1 : 0;
    }
    protected getData(response: any): any[] {
        return response.data;
    }
    protected getInstAuthors(element: any): { first_name: string, last_name: string, orcid?: string, affiliation?: string }[] {
        return null;
    }
    protected getAuthors(element: any): string {
        return null;
    }
    protected getGreaterEntity(element: any): GreaterEntity {
        return null;
    }
    protected getPublisher(element: any): Publisher {
        return null;
    }
    protected getPubDate(element: any): Date {
        return null;
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
        return element['oa_status'];
    }
    protected getContract(element: any): string {
        return null;
    }
    protected getLicense(element: any): string {
        if (element.best_oa_location !== null) {
            if (element.best_oa_location.license) {
                return element.best_oa_location.license;
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

    protected finalize(orig: Publication, element: any): {fields:string[], pub: Publication} {
        orig.is_oa = element['is_oa'];
        orig.oa_status = element['oa_status'];
        orig.is_journal_oa = element['journal_is_oa'];
        orig.best_oa_host = element['best_oa_location']? element['best_oa_location']['host_type'] : null;
        return {fields: ['is_oa','oa_status','journal_is_oa','best_oa_location'], pub: orig};
    }
}