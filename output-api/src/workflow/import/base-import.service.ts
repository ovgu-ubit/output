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
export class BASEImportService extends ApiImportOffsetService {

    constructor(protected publicationService: PublicationService, protected authorService: AuthorService,
        protected geService: GreaterEntityService, protected funderService: FunderService, protected publicationTypeService: PublicationTypeService,
        protected publisherService: PublisherService, protected oaService: OACategoryService, protected contractService: ContractService,
        protected invoiceService: InvoiceService, protected reportService: ReportItemService, protected instService: InstituteService,
        protected languageService: LanguageService, protected roleService: RoleService, protected configService: AppConfigService,
        protected http: HttpService) {
        super(publicationService, authorService, geService, funderService, publicationTypeService, publisherService, oaService, contractService, invoiceService, reportService, instService, languageService, roleService, configService, http);

    }

    private searchText = '';

    protected updateMapping: UpdateMapping = {
        author_inst: UpdateOptions.IGNORE,
        authors: UpdateOptions.REPLACE_IF_EMPTY,
        title: UpdateOptions.IGNORE,
        pub_type: UpdateOptions.REPLACE_IF_EMPTY,
        oa_category: UpdateOptions.IGNORE,
        greater_entity: UpdateOptions.REPLACE_IF_EMPTY,
        publisher: UpdateOptions.REPLACE_IF_EMPTY,
        contract: UpdateOptions.IGNORE,
        funder: UpdateOptions.IGNORE,
        doi: UpdateOptions.REPLACE_IF_EMPTY,
        pub_date: UpdateOptions.REPLACE_IF_EMPTY,
        link: UpdateOptions.REPLACE_IF_EMPTY,
        language: UpdateOptions.REPLACE_IF_EMPTY,
        license: UpdateOptions.REPLACE_IF_EMPTY,
        invoice: UpdateOptions.IGNORE,
        status: UpdateOptions.IGNORE,
        abstract: UpdateOptions.IGNORE,
        citation: UpdateOptions.IGNORE,
        page_count: UpdateOptions.IGNORE,
        peer_reviewed: UpdateOptions.IGNORE,
        cost_approach: UpdateOptions.REPLACE_IF_EMPTY,
    };
    //e.g.https://api.base-search.net/cgi-bin/BaseHttpSearchInterface.fcgi?func=PerformSearch&format=json&query=(guericke)
    protected url = 'https://api.base-search.net/cgi-bin/BaseHttpSearchInterface.fcgi?';
    protected max_res: number = 100;
    protected max_res_name = 'hits';
    protected offset_name = 'offset';
    protected offset_count = 0;
    protected offset_start = 0;
    protected params: { key: string, value: string }[] = [
        { key: 'func', value: 'PerformSearch' },
        { key: 'query', value: '(' + this.searchText.slice(0, this.searchText.length - 4) + ')+and+dcyear:2022' },
        { key: 'format', value: 'json' }];
    protected name = 'BASE';
    protected parallelCalls = 1;

    protected async init() {
        (await this.configService.get('searchTags')).forEach(tag => {
            this.searchText += tag + "+OR+"
        })
    }

    setReportingYear(year: string) {
        this.params = [
            { key: 'func', value: 'PerformSearch' },
            { key: 'query', value: '(' + this.searchText.slice(0, this.searchText.length - 4) + ')+and+dcyear:' + year },
            { key: 'format', value: 'json' }]
    }
    protected importTest(element: any): boolean {
        return element;
    }

    protected getDOI(element: any): string {
        return element['dcdoi'] && element['dcdoi'].length > 0 ? element['dcdoi'][0] : null;
    }
    protected getTitle(element: any): string {
        return element['dctitle'];
    }
    protected getNumber(response: any): number {
        return response.data.response['numFound'];
    }
    protected getData(response: any): any[] {
        return response.data.response['docs'];
    }
    protected getInstAuthors(element: any): { first_name: string, last_name: string, orcid?: string, affiliation?: string }[] {
        return [];
    }
    protected getAuthors(element: any): string {
        let elem = element['dccreator'] ? element['dccreator'] : element['dcperson'];
        if (!elem || elem[0] === '.') return '*tbd*';
        let res = elem.reduce((v, c) => v + c + ';', '');
        return res.slice(0, res.length - 1)
    }
    protected getGreaterEntity(element: any): GreaterEntity {
        return {
            label: element['dcsource']
        }
    }
    protected getPublisher(element: any): Publisher {
        return element['dcpublisher'] && element['dcpublisher'].length > 0 ? { label: element['dcpublisher'][0] } : null;
    }
    protected getPubDate(element: any): Date {
        if (!element['dcdate']) return new Date(Date.UTC(element['dcyear'], 0));
        let date = Date.parse(element['dcdate'])
        if (date && !Number.isNaN(date)) {
            let pubdate = new Date();
            pubdate.setTime(date);
            return pubdate;
        }
        let data = element['dcdate'].split('-');

        let pubdate = null;
        if (data.length === 3) pubdate = new Date(Date.UTC(data[0], data[1] - 1, data[2]));
        else if (data.length === 2) pubdate = new Date(Date.UTC(data[0], data[1] - 1));
        else pubdate = new Date(Date.UTC(data[0], 0));

        return pubdate;
    }
    protected getLanguage(element: any): string {
        return element['dclang'] && element['dclang'].length > 0 ? element['dclang'][0] : null;
    }
    protected getLink(element: any): string {
        return element['dclink'];
    }
    protected getFunder(element: any): Funder[] {
        return [];
    }
    protected getPubType(element: any): string {
        if (element['dctypenorm'] && element['dctypenorm'].length > 0) {
            switch (element['dctypenorm'][0]) {
                case 11:
                    return 'book'
                case 111:
                    return 'chapter'
                case 12:
                    return 'editorial'
                case 121:
                    return 'article'
                case 13:
                    return 'proceedings'
                case 14:
                    return 'techreport'
                case 183:
                    return 'dissertation'
                case 19:
                    return 'preprint'
                case 6:
                    return 'software'
                case 7:
                    return 'dataset'
                default:
                    return null;
            }
        } else if (element['dctype']) {
            if (element['dctype'] && element['dctype'].find(e => e.toLowerCase().includes('article'))) return 'Article'
            if (element['dctype'] && element['dctype'].find(e => e.toLowerCase().includes('book'))) return 'Book'
            return null;
        } else return null;
    }
    protected getOACategory(element: any): string {
        return null;
    }
    protected getContract(element: any): string {
        return null;
    }
    protected getLicense(element: any): string {
        return element['dcrightsnorm'] && element['dcrightsnorm'].length > 0 ? element['dcrightsnorm'][0] : null;
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
    protected getCitation(element: any): { volume?: string, issue?: string, first_page?: string, last_page?: string, publisher_location?: string, edition?: string, article_number?: string } {
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