import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { Funder } from '../../entity/Funder';
import { Identifier } from '../../entity/Identifier';
import { UpdateMapping, UpdateOptions } from '../../../../output-interfaces/Config';
import { AuthorService } from '../entities/author.service';
import { ContractService } from '../entities/contract.service';
import { CostTypeService } from '../entities/cost-type.service';
import { FunderService } from '../entities/funder.service';
import { GreaterEntityService } from '../entities/greater-entitiy.service';
import { OACategoryService } from '../entities/oa-category.service';
import { PublicationTypeService } from '../entities/publication-type.service';
import { PublicationService } from '../entities/publication.service';
import { PublisherService } from '../entities/publisher.service';
import { ReportItemService } from '../report-item.service';
import { ApiImportOffsetService } from './api-import-offset.service';
import { InstitutionService } from '../entities/institution.service';
import { LanguageService } from '../entities/language.service';
import { Publisher } from '../../entity/Publisher';
import { ConfigService } from '@nestjs/config';
import { GreaterEntity } from '../../entity/GreaterEntity';
import { RoleService } from '../entities/role.service';

@Injectable()
export class BibliographyImportService extends ApiImportOffsetService {

    constructor(protected publicationService: PublicationService, protected authorService: AuthorService,
        protected geService: GreaterEntityService, protected funderService: FunderService, protected publicationTypeService: PublicationTypeService,
        protected publisherService: PublisherService, protected oaService: OACategoryService, protected contractService: ContractService,
        protected costTypeService: CostTypeService, protected reportService: ReportItemService, protected instService: InstitutionService, protected languageService: LanguageService, protected roleService: RoleService, protected configService: ConfigService, protected http: HttpService) {
        super(publicationService, authorService, geService, funderService, publicationTypeService, publisherService, oaService, contractService, costTypeService, reportService, instService, languageService, roleService, configService, http);
    }

    protected updateMapping: UpdateMapping = {
        author_inst: UpdateOptions.IGNORE,
        authors: UpdateOptions.REPLACE_IF_EMPTY,
        title: UpdateOptions.IGNORE,
        pub_type: UpdateOptions.REPLACE,
        oa_category: UpdateOptions.REPLACE_IF_EMPTY,
        greater_entity: UpdateOptions.IGNORE,
        publisher: UpdateOptions.REPLACE_IF_EMPTY,
        contract: UpdateOptions.IGNORE,
        funder: UpdateOptions.IGNORE,
        doi: UpdateOptions.REPLACE_IF_EMPTY,
        pub_date: UpdateOptions.REPLACE_IF_EMPTY,
        link: UpdateOptions.REPLACE_IF_EMPTY,
        language: UpdateOptions.REPLACE_IF_EMPTY,
        license: UpdateOptions.REPLACE_IF_EMPTY,
        invoice: UpdateOptions.REPLACE_IF_EMPTY,
        status: UpdateOptions.IGNORE,
        editors: UpdateOptions.IGNORE,
        abstract: UpdateOptions.IGNORE,
        citation: UpdateOptions.IGNORE,
        page_count: UpdateOptions.IGNORE,
        peer_reviewed: UpdateOptions.REPLACE_IF_EMPTY,
    };
    protected url = 'https://heimdall.ub.ovgu.de/jetty/SRU_Engine/bibliography?';
    protected max_res: number = 100;
    protected max_res_name = 'max';
    protected offset_name = 'pos';
    protected offset_count = 0;
    protected offset_start = 1;
    protected params: { key: string, value: string }[] = [{ key: 'year', value: '2022' }];//TODO year from DB?
    protected name = 'Bibliography';
    protected parallelCalls = 1;

    setReportingYear(year: string) {
        this.params = [{ key: 'year', value: year }]
    }
    protected getDOI(element: any): string {
        return element['doi'];
    }
    protected getTitle(element: any): string {
        return element['title'].replace('/@/g', '');
    }
    protected getNumber(response: any): number {
        return response.data.count;
    }
    protected getData(response: any): any[] {
        return response.data;
    }
    protected importTest(element: any): boolean {
        return element;
    }
    protected getInstAuthors(element: any): {
        first_name: string; last_name: string; orcid?: string; affiliation?: string;
    }[] {
        return [];
    }
    protected getAuthors(element: any): string {
        let authors = element['co_authors'].length > 0 ? element['author'] + '; ' + element['co_authors'].split('|').join('; ') : element['author'];
        return authors;
    }
    protected getGreaterEntity(element: any): GreaterEntity {
        let issn = element['greater_entity_issn'];
        return {
            label: element['greater_entity'],
            identifiers: issn ? [{ type: 'issn', value: issn }] : undefined
        };
    }
    protected getPublisher(element: any): Publisher {
        return { label: element['publisher'] };
    }
    protected getPubDate(element: any): Date {
        return new Date(Date.UTC(element['year_of_creation'], 0));
    }
    protected getLink(element: any): string {
        return element['link'];
    }
    protected getLanguage(element: any): string {
        return element['language_text'];
    }
    protected getFunder(element: any): Funder[] {
        return [];
    }
    protected getPubType(element: any): string {
        let pub_type = 'Unknown';
        if (element['local_expansion'].toLowerCase().includes('dissertation')) pub_type = 'PhD thesis';
        else if (element['local_expansion'].toLowerCase().includes('habilitation')) pub_type = 'Postdoctoral thesis';
        else if (element['local_expansion'].toLowerCase().includes('begutachteter zeitschriftenartikel (peer reviewed)')) pub_type = 'Journal article';
        else if (element['local_expansion'].toLowerCase().includes('originalartikel in begutachteter internationaler Zeitschrift')) pub_type = 'Journal article';
        else if (element['local_expansion'].toLowerCase().includes('begutachteter buchbeitrag')) pub_type = 'Reviewed book chapter';
        else if (element['local_expansion'].toLowerCase().includes('abstract')) pub_type = 'Abstract';
        else if (element['local_expansion'].toLowerCase().includes('nicht begutachteter zeitschriftenaufsatz')) pub_type = 'Article (not reviewed)';
        else if (element['local_expansion'].toLowerCase().includes('nicht begutachteter Buchbeitrag')) pub_type = 'Book chapter';
        else if (element['local_expansion'].toLowerCase().includes('herausgeberschaft')) pub_type = 'Editorship';
        else if (element['local_expansion'].toLowerCase().includes('forschungsbericht')) pub_type = 'Technical report';
        else if (element['local_expansion'].toLowerCase().includes('rezension')) pub_type = 'Recension';
        else if (element['local_expansion'].toLowerCase().includes('lehrbuch')) pub_type = 'Book';
        else if (element['local_expansion'].toLowerCase().includes('monografie')) pub_type = 'Book';

        return pub_type;
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
        return null;
    }
    protected getStatus(element: any): number {
        return 1;
    }
    protected getEditors(element: any): string {
        return null;
    }
    protected getAbstract(element: any): string {
        return null;
    }
    protected getCitation(element: any): { volume: number, issue: number, first_page: number, last_page: number } {
        return null;
    }
    protected getPageCount(element: any): number {
        return null;
    }
    protected getPeerReviewed(element: any): boolean {
        return element['local_expansion'].toLowerCase().includes('begutachtet') && !element['local_expansion'].toLowerCase().includes('nicht begutachtet');
    }
}