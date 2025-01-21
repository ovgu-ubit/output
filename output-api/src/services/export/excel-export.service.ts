import { Injectable } from '@nestjs/common';
import { AbstractExportService } from './abstract-export.service';
import { PublicationService } from '../entities/publication.service';
import { ReportItemService } from '../report-item.service';
import { SearchFilter } from '../../../../output-interfaces/Config';
import { Publication } from '../../entity/Publication';
import { PublicationIndex } from '../../../../output-interfaces/PublicationIndex';
import { AbstractFilterService } from '../filter/abstract-filter.service';
import { ConfigService } from '@nestjs/config';
import { InvoiceService } from '../entities/invoice.service';
import * as XLSX from 'xlsx';

@Injectable()
/**
 * abstract class for all exports
 */
export class ExcelExportService extends AbstractExportService {

    excel_response = true;
    df: Intl.DateTimeFormat;

    constructor(private publicationService: PublicationService, private reportService: ReportItemService, private configService: ConfigService, private invoiceService: InvoiceService) {
        super();
        this.df = new Intl.DateTimeFormat('de-DE');
    }

    protected name = 'Excel-Export';

    public async export(filter?: { filter: SearchFilter, paths: string[] }, filterServices?: AbstractFilterService<PublicationIndex | Publication>[], by_user?: string) {
        this.status_text = 'Started on ' + new Date();
        this.report = this.reportService.createReport('Export', this.name, by_user);

        let pubs = await this.publicationService.getAll(filter?.filter);
        if (filter) for (let path of filter.paths) {
            let so = this.configService.get('filter_services').findIndex(e => e.path === path)
            if (so === -1) continue;
            pubs = await filterServices[so].filter(pubs) as Publication[]
        }
        let cost_types = await this.invoiceService.getCostTypes();

        let rows = [];
        for (let pub of pubs) {
            let row = {
                id: pub.id,
                locked: pub.locked,
                status: pub.status,
                title: pub.title,
                doi: pub.doi,
                link: pub.link,
                authors: pub.authors,
                authors_inst: pub.authorPublications?.map(e => { return e.author.last_name + ', ' + e.author.first_name }).join(' | '),
                institutes: pub.authorPublications?.map(e => { return e.author.last_name + ', ' + e.author.first_name }).join(' | '),
                corr_authors: pub.authorPublications?.filter(e => e.corresponding).map(e => { return e.author.last_name + ', ' + e.author.first_name }).join(' | '),
                corr_institutes: pub.authorPublications?.filter(e => e.corresponding).map(e => { return e.institute?.label }).join(' | '),
                greater_entity: pub.greater_entity?.label,
                pub_date: pub.pub_date,
                publisher: pub.publisher?.label,
                language: pub.language?.label,
                oa_category: pub.oa_category?.label,
                pub_type: pub.pub_type?.label,
                funders: pub.funders?.map(e => e.label).join(' | '),
                contract: pub.contract?.label,
                cost_approach: pub.cost_approach,
                invoice_numbers: pub.invoices?.map(e => e.number).join(' | '),
                net_costs: pub.invoices?.map(e => e.cost_items.map(e => e.euro_value).reduce((v, e) => v + e, 0)).reduce((v, e) => v + e, 0),
                paid_amount: pub.invoices?.map(e => e.booking_amount).reduce((v, e) => v + e, 0),
                cost_center: pub.invoices?.map(e => e.cost_center?.label).join(' | '),
                data_source: pub.dataSource,
                second_pub: pub.second_pub,
                add_info: pub.add_info,
                import_date: pub.import_date,
                edit_date: pub.edit_date
            }
            if (pub.invoices.length > 0) for (let ct of cost_types) {
                row[ct.label] = pub.invoices?.map(e => e.cost_items.filter(e => e.cost_type && e.cost_type.id === ct.id).map(e => e.euro_value + e.vat).reduce((v, e) => v + e, 0)).reduce((v, e) => v + e, 0)
            }

            rows.push(row);
        }

        let workbook = XLSX.utils.book_new();
        let worksheet = XLSX.utils.json_to_sheet(rows)
        XLSX.utils.book_append_sheet(workbook, worksheet, "Publikationen");

        //finalize
        this.progress = 0;
        this.reportService.finish(this.report, {
            status: 'Successfull export on ' + new Date(),
            count_import: pubs.length
        })
        this.status_text = 'Successfull export on ' + new Date();
        return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    }
}