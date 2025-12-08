import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { SearchFilter } from '../../../../output-interfaces/Config';
import { PublicationIndex } from '../../../../output-interfaces/PublicationIndex';
import { Publication } from '../../publication/core/Publication.entity';
import { AbstractFilterService } from '../filter/abstract-filter.service';
import { AbstractExportService, ExportService } from './abstract-export.service';
import { PublicationService } from '../../publication/core/publication.service';
import { ReportItemService } from '../report-item.service';
import { AppConfigService } from '../../config/app-config.service';

@ExportService({ path: 'juelich' })
@Injectable()
export class JulichExportService extends AbstractExportService {

    excel_response = true;
    df: Intl.DateTimeFormat;

    constructor(private publicationService: PublicationService, private reportService: ReportItemService, private configService: AppConfigService
    ) {
        super();
        this.df = new Intl.DateTimeFormat('de-DE');
    }

    protected name = 'Juelich-Export';

    public async export(filter?: { filter: SearchFilter, paths: string[] }, filterServices?: AbstractFilterService<PublicationIndex | Publication>[], by_user?: string) {
        this.status_text = 'Started on ' + new Date();
        this.report = await this.reportService.createReport('Export', this.name, by_user);

        let pubs = await this.publicationService.getAll(filter?.filter);
        if (filter && filter.paths) for (const path of filter.paths) {
            const so = (await this.configService.get('filter_services')).findIndex(e => e.path === path)
            if (so === -1) continue;
            pubs = await filterServices[so].filter(pubs) as Publication[]
        }

        const rows = [];
        for (const pub of pubs) {
            const rowMaster: any = {
                doi: pub.doi,
                foerderfaehig: '',
                name_des_verlags: pub.publisher?.label,
                publikationsform: pub.pub_type?.label,
                cc_lizenz: pub.best_oa_license,
                kostensplitting: '',
                zuschussbetrag_dfg: '',
                zuordnung_zu_transformationsvertrag: pub.contract?.label,
                publikationsjahr: pub.pub_date ? pub.pub_date.getFullYear() : pub.pub_date_print?.getFullYear(),
                projektnummer_projektID: pub.grant_number,
                dfg_wissenschaftsbereich: ''
            }
            if (pub.invoices && pub.invoices.length > 0) {
                for (const inv of pub.invoices) {
                    if (inv.cost_items && inv.cost_items.length > 0) {
                        const row = {
                            ...rowMaster,
                            bemerkung: inv.cost_items[0].label,
                            originalwaehrung: inv.cost_items[0].orig_currency,
                            rechnungsbetrag_in_originalwaehrung: inv.cost_items[0].orig_value,
                            euro_netto: inv.cost_items[0].euro_value,
                            steuersatz: inv.cost_items[0].vat / inv.cost_items[0].euro_value,
                            euro_brutto: inv.cost_items[0].euro_value + inv.cost_items[0].vat,
                            gebuehrenart: inv.cost_items[0].cost_type?.label,
                            zuordnung_zu_mitgliedschaft: '',
                            rechnungsjahr_lizenzjahr: inv.date?.getFullYear(),
                        }
                        rows.push(row);
                    }
                }
            } else if (pub.contract) {
                const row = {
                    ...rowMaster,
                    bemerkung: '',
                    originalwaehrung: '',
                    rechnungsbetrag_in_originalwaehrung: '',
                    euro_netto: 0,
                    steuersatz: 0,
                    euro_brutto: 0,
                    gebuehrenart: pub.oa_category?.label.toLocaleLowerCase().includes("gold") ? "gold-oa" : (pub.oa_category?.label.toLocaleLowerCase().includes("hybrid") ? "hybrid-oa" : ""),
                    zuordnung_zu_mitgliedschaft: '',
                    rechnungsjahr_lizenzjahr: pub.contract_year,
                }
                rows.push(row)
            }
        }

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(rows, {
            cellStyles: true, header: ['doi', 'foerderfaehig', 'bemerkung', 'name_des_verlags', 'publikationsform', 'cc_lizenz',
                'originalwaehrung', 'rechnungsbetrag_in_originalwaehrung', 'euro_netto', 'steuersatz', 'euro_brutto', 'kostensplitting', 'zuschussbetrag_dfg', 'gebuehrenart',
                'zuordnung_zu_mitgliedschaft', 'zuordnung_zu_transformationsvertrag', 'rechnungsjahr_lizenzjahr', 'publikationsjahr', 'projektnummer_projektID', 'dfg_wissenschaftsbereich']
        })
        //header names
        XLSX.utils.sheet_add_aoa(worksheet, [["DOI", "förderfähig", "Bemerkung", "Name des Verlags", "Publikationsform", "CC-Lizenz", "Originalwährung",
            "Rechnungsbetrag in Originalwährung", "Euro netto", "Steuersatz", "Euro brutto", "Kostensplittung", "Zuschussbetrag DFG", "Gebührenart",
            "Zuordnung zu Mitgliedschaft", "Zuordnung zu Transformationsvertrag", "Rechnungsjahr / Lizenzjahr", "Publikationsjahr", "Projektnummer/Projekt ID DFG",
            "DFG-Wissenschaftsbereich"]], { origin: "A1" });
        //formatting
        if (!worksheet["!cols"]) worksheet["!cols"] = [];
        for (let i = 2; i <= rows.length + 1; i++) {
            worksheet["H" + i].z = '#,##0.00'; //rechnungsbetrag orig
            worksheet["I" + i].z = '#,##0.00'; //euro netto
            worksheet["J" + i].z = '0.00%'; //vat
            worksheet["K" + i].z = '#,##0.00'; //euro brutto
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