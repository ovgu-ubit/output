import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as XLSX from 'xlsx';
import { SearchFilter } from '../../../../output-interfaces/Config';
import { PublicationIndex } from '../../../../output-interfaces/PublicationIndex';
import { Publication } from '../../entity/Publication';
import { PublicationService } from '../entities/publication.service';
import { AbstractFilterService } from '../filter/abstract-filter.service';
import { ReportItemService } from '../report-item.service';
import { AbstractExportService } from './abstract-export.service';

@Injectable()
/**
 * abstract class for all exports
 */
export class JulichExportService extends AbstractExportService {

    excel_response = true;
    df: Intl.DateTimeFormat;

    constructor(private publicationService: PublicationService, private reportService: ReportItemService, private configService: ConfigService
    ) {
        super();
        this.df = new Intl.DateTimeFormat('de-DE');
    }

    protected name = 'Juelich-Export';

    public async export(filter?: { filter: SearchFilter, paths: string[] }, filterServices?: AbstractFilterService<PublicationIndex | Publication>[], by_user?: string) {
        this.status_text = 'Started on ' + new Date();
        this.report = this.reportService.createReport('Export', this.name, by_user);

        let pubs = await this.publicationService.getAll(filter?.filter);
        if (filter) for (let path of filter.paths) {
            let so = this.configService.get('filter_services').findIndex(e => e.path === path)
            if (so === -1) continue;
            pubs = await filterServices[so].filter(pubs) as Publication[]
        }

        let rows = [];
        for (let pub of pubs) {
            if (!pub.invoices || pub.invoices.length === 0 || !pub.invoices[0].cost_items || pub.invoices[0].cost_items.length === 0) continue;
            let row = {
                doi: pub.doi,
                foerderfaehig: '',
                bemerkung: pub.invoices[0].cost_items[0].label,
                name_des_verlags: pub.publisher?.label,
                publikationsform: pub.pub_type?.label,
                cc_lizenz: pub.best_oa_license,
                originalwaehrung: pub.invoices[0].cost_items[0].orig_currency,
                rechnungsbetrag_in_originalwaehrung: pub.invoices[0].cost_items[0].orig_value,
                euro_netto: pub.invoices[0].cost_items[0].euro_value,
                steuersatz: pub.invoices[0].cost_items[0].vat / pub.invoices[0].cost_items[0].euro_value,
                euro_brutto: pub.invoices[0].cost_items[0].euro_value + pub.invoices[0].cost_items[0].vat,
                kostensplitting: '',
                zuschussbetrag_dfg: '',
                gebuehrenart: pub.invoices[0].cost_items[0].cost_type?.label,
                zuordnung_zu_mitgliedschaft: pub.invoices[0].cost_items[0].cost_type?.label,
                zuordnung_zu_transformationsvertrag: pub.contract?.label,
                rechnungsjahr_lizenzjahr: pub.invoices[0].booking_date?.getFullYear(),
                publikationsjahr: pub.pub_date ? pub.pub_date.getFullYear() : pub.pub_date_print?.getFullYear(),
                projektnummer_projektID: pub.grant_number,
                dfg_wissenschaftsbereich: ''
            }

            rows.push(row);
        }

        let workbook = XLSX.utils.book_new();
        let worksheet = XLSX.utils.json_to_sheet(rows, { cellStyles: true })
        //header names
        XLSX.utils.sheet_add_aoa(worksheet, [["DOI", "förderfähig", "Bemerkung", "Name des Verlags", "Publikationsform", "CC-Lizenz", "Originalwährung",
            "Rechnungsbetrag in Originalwährung", "Euro netto", "Steuersatz", "Euro brutto", "Kostensplittung", "Zuschussbetrag DFG", "Gebührenart",
            "Zuordnung zu Mitgliedschaft", "Zuordnung zu Transformationsvertrag", "Rechnungsjahr / Lizenzjahr", "Publikationsjahr", "Projektnummer/Projekt ID DFG",
            "DFG-Wissenschaftsbereich"]], { origin: "A1" });
        //formatting
        if (!worksheet["!cols"]) worksheet["!cols"] = [];
        for (let i = 2; i <= rows.length + 1; i++) {
            worksheet["H" + i].z = '#,##0.00'; //rechnungsbetrag orig
            worksheet["I" + i].z = '#,##0.00 "€"'; //euro netto
            worksheet["J" + i].z = '0.00%'; //vat
            worksheet["K" + i].z = '#,##0.00 "€"'; //euro brutto
        }

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