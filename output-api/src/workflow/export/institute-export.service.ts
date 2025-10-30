import { Injectable } from '@nestjs/common';
import { SearchFilter } from '../../../../output-interfaces/Config';
import { PublicationIndex } from '../../../../output-interfaces/PublicationIndex';
import { Publication } from '../../publication/core/Publication.entity';
import { InstituteService } from '../../institute/institute.service';
import { AbstractFilterService } from '../filter/abstract-filter.service';
import { AbstractExportService, ExportService } from './abstract-export.service';
import { ReportItemService } from '../report-item.service';

@ExportService({path: 'institute'})
@Injectable()
export class InstituteExportService extends AbstractExportService {

    quote = '"';
    sep = ';';
    df:Intl.DateTimeFormat;

    constructor(private service:InstituteService, private reportService:ReportItemService) {
        super(); 
        this.df = new Intl.DateTimeFormat('de-DE');
    }

    protected name = 'Institut-Export';

    public async export(filter?:{filter:SearchFilter, paths:string[]}, filterServices?:AbstractFilterService<PublicationIndex|Publication>[], by_user?: string) {
        this.status_text = 'Started on ' + new Date();
        this.report = await this.reportService.createReport('Export',this.name, by_user);

        let pubs = await this.service.get();

        let res = "id;label;short_label;super_institute\n";
        for (let pub of pubs) {
            res+=this.format(pub.id);
            res+=this.format(pub.label);
            res+=this.format(pub.short_label);
            res+=this.format(pub.super_institute?.short_label);
            res=res.slice(0,res.length-1);
            res+='\n';
        }
        //res = res.replace(/undefined/g, '');
        //finalize
        this.progress = 0;
        this.reportService.finish(this.report, {
            status: 'Successfull export on ' + new Date(),
            count_import: pubs.length
        })
        this.status_text = 'Successfull export on ' + new Date();
        return res;
    }

    format(field):string {
        let res = this.quote;
        let value = field? (field.label? field.label : field) : '';
        if (typeof value === 'string') res += value.replace(new RegExp(this.quote,"g"),"<quote>");
        else if (value instanceof Date) res += this.df.format(value)
        else if (Number.isNaN(value)) res += value.toLocaleString().slice(0,10000);
        else res += value;
        res += this.quote;
        res += this.sep;
        return res;
    }
}