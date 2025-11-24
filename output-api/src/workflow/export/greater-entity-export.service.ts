import { Injectable } from '@nestjs/common';
import { SearchFilter } from '../../../../output-interfaces/Config';
import { PublicationIndex } from '../../../../output-interfaces/PublicationIndex';
import { Publication } from '../../publication/core/Publication.entity';
import { GreaterEntityService } from '../../greater_entity/greater-entitiy.service';
import { AbstractFilterService } from '../filter/abstract-filter.service';
import { AbstractExportService, ExportService } from './abstract-export.service';
import { ReportItemService } from '../report-item.service';

@ExportService({path: 'greater_entity'})
@Injectable()
export class GreaterEntityExportService extends AbstractExportService {

    quote = '"';
    sep = ';';
    df:Intl.DateTimeFormat;

    constructor(private service:GreaterEntityService, private reportService:ReportItemService) {
        super(); 
        this.df = new Intl.DateTimeFormat('de-DE');
    }

    protected name = 'Größere-Einheiten-Export';

    public async export(filter?:{filter:SearchFilter, paths:string[]}, filterServices?:AbstractFilterService<PublicationIndex|Publication>[], by_user?: string) {
        this.status_text = 'Started on ' + new Date();
        this.report = await this.reportService.createReport('Export',this.name, by_user);

        const pubs = await this.service.get();

        let res = "id;label;doaj_since;doaj_until;identifiers\n";
        for (const pub of pubs) {
            res+=this.format(pub.id);
            res+=this.format(pub.label);
            res+=this.format(pub.doaj_since);
            res+=this.format(pub.doaj_until);
            res+=this.format(pub.identifiers?.map(x => x.value).join(' | '));
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
        const value = field? (field.label? field.label : field) : '';
        if (typeof value === 'string') res += value.replace(new RegExp(this.quote,"g"),"<quote>");
        else if (value instanceof Date) res += this.df.format(value)
        else if (Number.isNaN(value)) res += value.toLocaleString().slice(0,10000);
        else res += value;
        res += this.quote;
        res += this.sep;
        return res;
    }
}