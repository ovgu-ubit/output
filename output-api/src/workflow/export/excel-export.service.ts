import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AbstractExportService } from './abstract-export.service';
import { SearchFilter } from '../../../../output-interfaces/Config';
import { Publication } from '../../publication/core/Publication';
import { PublicationIndex } from '../../../../output-interfaces/PublicationIndex';
import { AbstractFilterService } from '../filter/abstract-filter.service';
import * as XLSX from 'xlsx';
import { AuthorService } from '../../author/author.service';
import { InstituteService } from '../../institute/institute.service';
import { GreaterEntityService } from '../../greater_entity/greater-entitiy.service';
import { PublisherService } from '../../publisher/publisher.service';
import { ContractService } from '../../contract/contract.service';
import { FunderService } from '../../funder/funder.service';
import { OACategoryService } from '../../oa_category/oa-category.service';
import { PublicationTypeService } from '../../pub_type/publication-type.service';
import { PublicationService } from '../../publication/core/publication.service';
import { InvoiceService } from '../../invoice/invoice.service';
import { ReportItemService } from '../report-item.service';
import { AppConfigService } from '../../config/app-config.service';

@Injectable()
/**
 * abstract class for all exports
 */
export class ExcelExportService extends AbstractExportService {

    excel_response = true;
    df: Intl.DateTimeFormat;

    constructor(private publicationService: PublicationService, private reportService: ReportItemService, private configService: AppConfigService, 
        private invoiceService: InvoiceService, private authorService: AuthorService, private instService:InstituteService,
        private geService: GreaterEntityService, private publService: PublisherService, private contractService:ContractService,
        private funderService: FunderService, private oaService: OACategoryService, private ptService:PublicationTypeService
    ) {
        super();
        this.df = new Intl.DateTimeFormat('de-DE');
    }

    protected name = 'Excel-Export';

    public async export(filter?: { filter: SearchFilter, paths: string[] }, filterServices?: AbstractFilterService<PublicationIndex | Publication>[], by_user?: string, withMasterData?: boolean) {
        this.status_text = 'Started on ' + new Date();
        this.report = await this.reportService.createReport('Export', this.name, by_user);

        let pubs = await this.publicationService.getAll(filter?.filter);
        if (filter) for (let path of filter.paths) {
            let so = (await this.configService.get('filter_services')).findIndex(e => e.path === path)
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
                institutes: pub.authorPublications?.map(e => { return e.institute?.label }).join(' | '),
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
        let worksheet = XLSX.utils.json_to_sheet(rows, { cellStyles: true })
        //formatting
        if (!worksheet["!cols"]) worksheet["!cols"] = [];
        worksheet["!cols"][XLSX.utils.decode_col("D")] = { width: 30 }
        worksheet["!cols"][XLSX.utils.decode_col("E")] = { width: 20 }
        worksheet["!cols"][XLSX.utils.decode_col("AB")] = { width: 20 }
        worksheet["!cols"][XLSX.utils.decode_col("AC")] = { width: 20 }
        for (let i = 2; i <= rows.length + 1; i++) {
            worksheet["T" + i].z = '#,##0.00 "€"'; //cost approach
            worksheet["V" + i].z = '#,##0.00 "€"'; //net costs
            worksheet["W" + i].z = '#,##0.00 "€"'; //paid amount
            worksheet["AB" + i].z = "DD.MM.YYYY HH:MM:SS"; //import date
            worksheet["AC" + i].z = "DD.MM.YYYY HH:MM:SS"; //edit date
            let columns = ["AD", "AE", "AF", "AG", "AH", "AI", "AJ", "AK", "AL", "AM", "AN", "AO", "AP", "AQ", "AR", "AS", "AT"]
            if (cost_types.length > columns.length) throw new InternalServerErrorException('too many cost types, please report to developer')
            for (let j = 0; j < cost_types.length; j++) {
                if (worksheet[columns[j] + "" + i]) worksheet[columns[j] + "" + i].z = '#,##0.00 "€"';
            }
        }

        XLSX.utils.book_append_sheet(workbook, worksheet, "Publikationen");
        if (withMasterData) {
            //authors
            rows = [];
            let authors = await this.authorService.get();
            for (let author of authors) {
                let row = {
                    id: author.id,
                    title: author.title,
                    first_name: author.first_name,
                    last_name: author.last_name,
                    orcid: author.orcid,
                    gnd_id: author.gnd_id,
                    institutes: author.institutes?.map(x => x.label).join(' | ')
                }
                rows.push(row);
            }
            let worksheet_authors = XLSX.utils.json_to_sheet(rows)
            XLSX.utils.book_append_sheet(workbook, worksheet_authors, "Personen");
            
            //institutes
            let insts = await this.instService.get();
            rows = [];
            for (let inst of insts) {
                let row = {
                    id: inst.id,
                    label: inst.label,
                    short_label: inst.short_label,
                    super_institute: inst.super_institute?.short_label
                }
                rows.push(row);
            }
            let worksheet_inst = XLSX.utils.json_to_sheet(rows)
            XLSX.utils.book_append_sheet(workbook, worksheet_inst, "Institute");

            //greater entities
            let ges = await this.geService.get();
            rows = [];
            for (let ge of ges) {
                let row = {
                    id: ge.id,
                    label: ge.label,
                    doaj_since: ge.doaj_since,
                    doaj_until: ge.doaj_until,
                    identifiers: ge.identifiers?.map(x => x.value).join(' | ')
                }
                rows.push(row);
            }
            let worksheet_ge = XLSX.utils.json_to_sheet(rows)
            XLSX.utils.book_append_sheet(workbook, worksheet_ge, "Größere Einheiten");

            //publishers
            let publs = await this.publService.get();
            rows = [];
            for (let publ of publs) {
                let row = {
                    id: publ.id,
                    label: publ.label,
                    doi_prefixes: publ.doi_prefixes?.map(x => x.doi_prefix).join(' | ')
                }
                rows.push(row);
            }
            let worksheet_publ = XLSX.utils.json_to_sheet(rows)
            XLSX.utils.book_append_sheet(workbook, worksheet_publ, "Verlage");

            //contracts
            let cons = await this.contractService.get();
            rows = [];
            for (let con of cons) {
                let row = {
                    id: con.id,
                    label: con.label,
                    publisher: con.publisher?.label,
                    start_date: con.start_date,
                    end_date: con.end_date,
                    internal_number: con.internal_number,
                    invoice_amount: con.invoice_amount,
                    invoice_information: con.invoice_information,
                    gold_option: con.gold_option,
                    verification_method: con.verification_method
                }
                rows.push(row);
            }
            let worksheet_con = XLSX.utils.json_to_sheet(rows)
            XLSX.utils.book_append_sheet(workbook, worksheet_con, "Verträge");

            //funder
            let funs = await this.funderService.get();
            rows = [];
            for (let fun of funs) {
                let row = {
                    id: fun.id,
                    label: fun.label,
                    doi: fun.doi,
                    ror_id: fun.ror_id
                }
                rows.push(row);
            }
            let worksheet_fun = XLSX.utils.json_to_sheet(rows)
            XLSX.utils.book_append_sheet(workbook, worksheet_fun, "Förderer");

            //oa cats
            let oas = await this.oaService.get();
            rows = [];
            for (let oa of oas) {
                let row = {
                    id: oa.id,
                    label: oa.label,
                    is_oa: oa.is_oa
                }
                rows.push(row);
            }
            let worksheet_oa = XLSX.utils.json_to_sheet(rows)
            XLSX.utils.book_append_sheet(workbook, worksheet_oa, "OA-Kategorien");

            //pub types
            let pts = await this.ptService.get();
            rows = [];
            for (let pt of pts) {
                let row = {
                    id: pt.id,
                    label: pt.label,
                    review: pt.review
                }
                rows.push(row);
            }
            let worksheet_pt = XLSX.utils.json_to_sheet(rows)
            XLSX.utils.book_append_sheet(workbook, worksheet_pt, "Publikationsarten");

            //cost center
            let ccs = await this.invoiceService.getCostCenters();
            rows = [];
            for (let cc of ccs) {
                let row = {
                    id: cc.id,
                    label: cc.label,
                    number: cc.number
                }
                rows.push(row);
            }
            let worksheet_cc = XLSX.utils.json_to_sheet(rows)
            XLSX.utils.book_append_sheet(workbook, worksheet_cc, "Kostenstellen");

            //cost types
            let cts = await this.invoiceService.getCostTypes();
            rows = [];
            for (let ct of cts) {
                let row = {
                    id: ct.id,
                    label: ct.label
                }
                rows.push(row);
            }
            let worksheet_ct = XLSX.utils.json_to_sheet(rows)
            XLSX.utils.book_append_sheet(workbook, worksheet_ct, "Kostenarten");
        }
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