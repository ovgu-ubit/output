import { Injectable } from '@nestjs/common';
import { SearchFilter } from '../../../../output-interfaces/Config';
import { PublicationIndex } from '../../../../output-interfaces/PublicationIndex';
import { Publication } from '../../publication/Publication';
import { PublicationTypeService } from '../entities/publication-type.service';
import { AbstractFilterService } from '../filter/abstract-filter.service';
import { ReportItemService } from '../report-item.service';
import { AbstractExportService } from './abstract-export.service';
import { OACategoryService } from '../../oa_category/oa-category.service';

@Injectable()
/**
 * abstract class for all exports
 */
export class OACatExportService extends AbstractExportService {

    quote = '"';
    sep = ';';
    df:Intl.DateTimeFormat;

    constructor(private service:OACategoryService, private reportService:ReportItemService) {
        super(); 
        this.df = new Intl.DateTimeFormat('de-DE');
    }

    protected name = 'Open-Access-Kategorien-Export';

    public async export(filter?:{filter:SearchFilter, paths:string[]}, filterServices?:AbstractFilterService<PublicationIndex|Publication>[], by_user?: string) {
        this.status_text = 'Started on ' + new Date();
        this.report = this.reportService.createReport('Export',this.name, by_user);

        let pubs = await this.service.get();

        let res = "id;label;is_oa\n";
        for (let pub of pubs) {
            res+=this.format(pub.id);
            res+=this.format(pub.label);
            res+=this.format(pub.is_oa);

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