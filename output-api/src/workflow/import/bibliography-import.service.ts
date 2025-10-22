import { Injectable } from '@nestjs/common';
import { UpdateMapping, UpdateOptions } from '../../../../output-interfaces/Config';
import { Funder } from '../../funder/Funder';
import { GreaterEntity } from '../../greater_entity/GreaterEntity';
import { Publisher } from '../../publisher/Publisher';
import { ApiImportOffsetService } from './api-import-offset.service';

@Injectable()
export class BibliographyImportService extends ApiImportOffsetService {

    public constructor(
        ...dependencies: ConstructorParameters<typeof ApiImportOffsetService>
    ) {
        super(...dependencies);
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
        abstract: UpdateOptions.IGNORE,
        citation: UpdateOptions.IGNORE,
        page_count: UpdateOptions.IGNORE,
        peer_reviewed: UpdateOptions.REPLACE_IF_EMPTY,
        cost_approach: UpdateOptions.REPLACE_IF_EMPTY,
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
        return element['local_expansion'].toLowerCase().includes('dissertation') || element['local_expansion'].toLowerCase().includes('habilitation');
    }
    protected getInstAuthors(element: any): {
        first_name: string; last_name: string; orcid?: string; affiliation?: string;
    }[] {
        let author = element['author'];
        let split = author.split(', ')
        if (split && split.length == 2) {
            return [{first_name: split[1], last_name: split[0]}]
        } else return [];
    }
    protected getAuthors(element: any): string {
        return element['author'];
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
        return element['local_expansion'].toLowerCase().includes('begutachtet') && !element['local_expansion'].toLowerCase().includes('nicht begutachtet');
    }
    protected getCostApproach(element: any): number {
        return null;
    }
}