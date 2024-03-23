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

@Injectable()
export class Output1ImportService extends ApiImportOffsetService {

    constructor(protected publicationService: PublicationService, protected authorService: AuthorService,
        protected geService: GreaterEntityService, protected funderService: FunderService, protected publicationTypeService: PublicationTypeService,
        protected publisherService: PublisherService, protected oaService: OACategoryService, protected contractService: ContractService, 
        protected costTypeService: CostTypeService, protected reportService:ReportItemService, protected instService:InstitutionService, protected languageService:LanguageService, protected configService: ConfigService, protected http: HttpService) {
        super(publicationService, authorService, geService, funderService, publicationTypeService, publisherService, oaService, contractService, costTypeService, reportService,instService, languageService, configService, http);
    }

    protected updateMapping: UpdateMapping = {
        author_inst: UpdateOptions.IGNORE,
        authors: UpdateOptions.REPLACE_IF_EMPTY,
        title: UpdateOptions.IGNORE,
        pub_type: UpdateOptions.REPLACE_IF_EMPTY,
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
        status: UpdateOptions.REPLACE_IF_EMPTY,
        editors :UpdateOptions.IGNORE,
        abstract :UpdateOptions.IGNORE,
        citation :UpdateOptions.IGNORE,
        page_count :UpdateOptions.IGNORE,
        peer_reviewed :UpdateOptions.IGNORE,
    };
    protected url = 'https://service.ub.ovgu.de/output/api/publications_export?';
    //protected url = 'http://localhost:3000/publications_export?';
    protected max_res: number = 100;
    protected max_res_name = 'max';
    protected offset_name = 'pos';
    protected offset_count = 0;
    protected offset_start = 1;
    protected params: { key: string, value: string }[] = [{ key: 'reporting_year', value: '2022' }];//TODO year from DB?
    protected name = 'Output v1';
    protected parallelCalls = 1;

    setReportingYear(year: string) {
        this.params = [{ key: 'reporting_year', value: year }]
    }
    protected getDOI(element: any): string {
        return element['doi'];
    }
    protected getTitle(element: any): string {
        return element['title'];
    }
    protected getNumber(response: any): number {
        return response.data;
    }
    protected getData(response: any): any[] {
        return response.data;
    }
    protected importTest(element: any): boolean {
        return element['locked'];//only import locked publications
    }
    protected getInstAuthors(element: any): {
        first_name: string; last_name: string; orcid?: string; affiliation?: string; corresponding?: boolean;
    }[] {
        let authors_inst = element['authors_up'];
        if (!authors_inst || authors_inst.length === 0) {
            //if no inst athors are given but corr-auth states OVGU, likely all authors are OVGU
            if (element['corresponding_author'] && !element['corresponding_author'].includes('kein OVGU') && element['corresponding_author'].includes('OVGU')) authors_inst = element['authors'];
            else return [];
        }
        let res = [];
        for (let item of authors_inst.split('; ')) {
            let corr = false;
            if (element['corresponding_author'] && !element['corresponding_author'].includes('kein OVGU') && (item.includes(element['corresponding_author']) || element['corresponding_author'].includes(item)
                || (element['corresponding_author'].match(/^OVGU$/) && authors_inst.indexOf(item) === 0))) corr = true; //if corr-auth states OVGU, first inst author is corresponding
            if (item.split(', ').length === 2) {
                res.push({ last_name: item.split(', ')[0], first_name: item.split(', ')[1], affiliation: corr ? element['faculty'] : undefined, corresponding: corr })
            }
        }
        return res;
    }
    protected getAuthors(element: any): string {
        return element['authors'];
    }
    protected getGreaterEntity(element: any): GreaterEntity {
        let issns = [];
        let issne = element['issne'].toUpperCase();
        if (issne && issne.match(/.{4}\-.{4}/)) issns.push({ type: 'issn', value: issne });
        let issnp = element['issnp'].toUpperCase();
        if (issnp && issnp !== issne && issnp.match(/.{4}\-.{4}/)) issns.push({ type: 'issn', value: issnp });
        return {
            label: element['journal'],
            identifiers: issns
        }
    }
    protected getPublisher(element: any): Publisher {
        return {label: element['publisher']};
    }
    protected getPubDate(element: any): Date {
        let item = element['pubDate'];
        if (item.match(/^[0-9]{4}$/)) return new Date(Date.UTC(item, 0));
        else if (item.match(/^[0-9]{2}\.[0-9]{2}\.[0-9]{4}$/)) return new Date(Date.UTC(item.split('\.')[2], item.split('\.')[1] - 1, item.split('\.')[0]));
        else if (item.match(/^[0-9]{4}\-[0-9]{2}\-[0-9]{2}$/)) return new Date(Date.UTC(item.split('\-')[0], item.split('\-')[1] - 1, item.split('\-')[2]));
        else return new Date(Date.UTC(element['reporting_year'],0));
    }
    protected getLink(element: any): string {
        return null;
    }
    protected getLanguage(element: any): string {
        return null;
    }
    protected getFunder(element: any): Funder[] {
        if (element['funder']) return element['funder'].split(';');
        else return [];
    }
    protected getPubType(element: any): string {
        return element['pub_type'];
    }
    protected getOACategory(element: any): string {
        if (element['oaCategory'].includes("Green")) return "Green";
        else return element['oaCategory'];
    }
    protected getContract(element: any): string {
        if (!element['license'] || element['license'] === -1) return null;
        else return element['license'].contract;
    }
    protected getLicense(element: any): string {
        return element['best_oa_license'];
    }
    protected getInvoiceInformation(element: any) {
        if (element['price']) {
            let numbers = element['price'].match(/\d+\.?\d+,?\d{0,2}/); //in German number format
            if (!numbers || numbers.length === 0) return []; //no number included
            let price = Number(numbers[0].replace('.', '').replace(',', '.'));
            let currency = "EUR";
            if (element['price'].includes('CHF')) currency = "CHF";
            else if (element['price'].includes('USD')) currency = "USD";
            else if (element['price'].includes('GBP')) currency = "GBP";
            else if (element['price'].includes('KZT')) currency = "KZT";
            else if (element['price'].includes('UAH')) currency = "UAH";

            if (currency !== 'EUR') return [{ 
                cost_items: [{
                    orig_value: price, 
                    orig_currency: currency, 
                    cost_type: element['costType']? element['costType'] : null
                }]
            }]; else return [{ 
                cost_items: [{
                    euro_value: price, 
                    cost_type: element['costType']? element['costType'] : null
                }]
            }]
        } else return [];
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