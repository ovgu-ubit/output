import { Injectable } from '@nestjs/common';
import { SearchFilter } from '../../../../output-interfaces/Config';
import { PublicationIndex } from '../../../../output-interfaces/PublicationIndex';
import { Publication } from '../../publication/core/Publication';
import { ContractService } from '../../contract/contract.service';
import { AbstractFilterService } from '../filter/abstract-filter.service';
import { ReportItemService } from '../report-item.service';
import { AbstractExportService } from './abstract-export.service';

@Injectable()
/**
 * abstract class for all exports
 */
export class ContractExportService extends AbstractExportService {

    quote = '"';
    sep = ';';
    df:Intl.DateTimeFormat;

    constructor(private service:ContractService, private reportService:ReportItemService) {
        super(); 
        this.df = new Intl.DateTimeFormat('de-DE');
    }

    protected name = 'Vertrag-Export';

    public async export(filter?:{filter:SearchFilter, paths:string[]}, filterServices?:AbstractFilterService<PublicationIndex|Publication>[], by_user?: string) {
        this.status_text = 'Started on ' + new Date();
        this.report = this.reportService.createReport('Export',this.name, by_user);

        let pubs = await this.service.get();

        let res = "id;label;publisher;start_date;end_date;internal_number;invoice_amount;invoice_information;gold_option;verification_method\n";
        for (let pub of pubs) {
            res+=this.format(pub.id);
            res+=this.format(pub.label);
            res+=this.format(pub.publisher.label);
            res+=this.format(pub.start_date);
            res+=this.format(pub.end_date);
            res+=this.format(pub.internal_number);
            res+=this.format(pub.invoice_amount);
            res+=this.format(pub.invoice_information);
            res+=this.format(pub.gold_option);
            res+=this.format(pub.verification_method);

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