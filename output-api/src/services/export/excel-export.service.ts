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
    df:Intl.DateTimeFormat;

    constructor(private publicationService:PublicationService, private reportService:ReportItemService, private configService:ConfigService, private invoiceService:InvoiceService) {
        super(); 
        this.df = new Intl.DateTimeFormat('de-DE');
    }

    protected name = 'Excel-Export';

    public async export(filter?:{filter:SearchFilter, paths:string[]}, filterServices?:AbstractFilterService<PublicationIndex|Publication>[], by_user?: string) {
        this.status_text = 'Started on ' + new Date();
        this.report = this.reportService.createReport('Export',this.name, by_user);

        let pubs = await this.publicationService.getAll(filter?.filter);
        if (filter) for (let path of filter.paths) {
            let so = this.configService.get('filter_services').findIndex(e => e.path === path)
            if (so === -1) continue;
            pubs = await filterServices[so].filter(pubs) as Publication[]
        }

        let workbook = XLSX.utils.book_new();
        let worksheet = XLSX.utils.json_to_sheet(pubs)
        XLSX.utils.book_append_sheet(workbook, worksheet, "Publikationen");

        //finalize
        this.progress = 0;
        this.reportService.finish(this.report, {
            status: 'Successfull export on ' + new Date(),
            count_import: pubs.length
        })
        this.status_text = 'Successfull export on ' + new Date();
        return XLSX.write(workbook, {type: "buffer", bookType: "xlsx"});
    }
}