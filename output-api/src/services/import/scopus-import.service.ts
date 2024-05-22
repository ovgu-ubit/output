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
import { Publisher } from '../../entity/Publisher';
import { GreaterEntity } from '../../entity/GreaterEntity';

@Injectable()
export class ScopusImportService extends ApiImportOffsetService {

    constructor(protected publicationService: PublicationService, protected authorService: AuthorService,
        protected geService: GreaterEntityService, protected funderService: FunderService, protected publicationTypeService: PublicationTypeService,
        protected publisherService: PublisherService, protected oaService: OACategoryService, protected contractService: ContractService,
        protected costTypeService: CostTypeService, protected reportService: ReportItemService, protected instService:InstitutionService, protected languageService:LanguageService, protected configService: ConfigService,
        protected http: HttpService) {
        super(publicationService, authorService, geService, funderService, publicationTypeService, publisherService, oaService, contractService, costTypeService, reportService,instService, languageService, configService, http);
        this.configService.get('searchTags').forEach(tag => {
            this.searchText += tag + " or "
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
    protected url = 'https://api.elsevier.com/content/search/scopus?';
    protected max_res: number = 20;
    protected max_res_name = 'count';
    protected offset_name = 'start';
    protected offset_count = 0;
    protected offset_start = 0;
    protected params: { key: string, value: string }[] = [
        { key: 'query.affiliation', value: '' },
        { key: 'query.bibliographic', value: '' }];
    protected name = 'Scopus';
    protected parallelCalls = 1;

    setReportingYear(year: string) {
        this.params = [
            { key: 'query', value: 'AFFIL('+this.searchText.slice(0, this.searchText.length - 4)+')+and+PUBYEAR+IS+'+year },
            { key: 'view', value: 'complete' },
            { key: 'apiKey', value: this.configService.get('api_key_scopus') }]
    }
    protected importTest(element: any): boolean {
        return element && this.authorsInstitution(element.author).length > 0;
    }

    protected getDOI(element: any): string {
        return null;
    }
    protected getTitle(element: any): string {
        return null;
    }
    protected getNumber(response: any): number {
        return response.data['search-results']['opensearch:totalResults'];
    }
    protected getData(response: any): any[] {
        return response.data['search-results']['entry'];
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

    protected getGreaterEntity(element: any): GreaterEntity {
        return null;
    }
    protected getPublisher(element: any): Publisher {
        return null;
    }
    protected getPubDate(element: any) {
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
        return null;
    }
    protected getContract(element: any): string {
        return null;
    }
    protected getLicense(element: any): string {
        return null;
    }
    protected getInvoiceInformation(element: any) {
        return [];
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