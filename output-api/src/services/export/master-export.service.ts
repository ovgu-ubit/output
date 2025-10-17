import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { AbstractExportService } from './abstract-export.service';
import { PublicationService } from '../../publication/publication.service';
import { ReportItemService } from '../report-item.service';
import { SearchFilter } from '../../../../output-interfaces/Config';
import { Publication } from '../../publication/Publication';
import { PublicationIndex } from '../../../../output-interfaces/PublicationIndex';
import { AbstractFilterService } from '../filter/abstract-filter.service';
import { ConfigService } from '@nestjs/config';
import { InvoiceService } from '../../invoice/invoice.service';

@Injectable()
/**
 * abstract class for all exports
 */
export class MasterExportService extends AbstractExportService {

    quote = '"';
    sep = ';';
    df:Intl.DateTimeFormat;

    constructor(private publicationService:PublicationService, private reportService:ReportItemService, private configService:ConfigService, private invoiceService:InvoiceService) {
        super(); 
        this.df = new Intl.DateTimeFormat('de-DE');
    }

    protected name = 'Master-Export';

    public async export(filter?:{filter:SearchFilter, paths:string[]}, filterServices?:AbstractFilterService<PublicationIndex|Publication>[], by_user?: string) {
        this.status_text = 'Started on ' + new Date();
        this.report = this.reportService.createReport('Export',this.name, by_user);

        let pubs = await this.publicationService.getAll(filter?.filter);
        if (filter) for (let path of filter.paths) {
            let so = this.configService.get('filter_services').findIndex(e => e.path === path)
            if (so === -1) continue;
            pubs = await filterServices[so].filter(pubs) as Publication[]
        }

        let res = "id;locked;status;title;doi;link;authors;authors_inst;institutes;corr_authors;corr_institutes;greater_entity;"
        +"pub_date;publisher;language;oa_category;pub_type;funders;contract;cost_approach;invoice_number;net costs;paid amount;cost_center;"
        +"data_source;second_pub;add_info;import_date;edit_date";
        //add cost type columns
        let cost_types = await this.invoiceService.getCostTypes();
        for (let ct of cost_types) {
            res+=";"+ct.label;
        }
        res+="\n";
        for (let pub of pubs) {
            res+=this.format(pub.id);
            res+=this.format(pub.locked);
            res+=this.format(pub.status);
            res+=this.format(pub.title);
            res+=this.format(pub.doi);
            res+=this.format(pub.link);
            res+=this.format(pub.authors);
            res+=this.format(pub.authorPublications?.map(e => {return e.author.last_name+', '+e.author.first_name}).join(' | '));
            res+=this.format(pub.authorPublications?.map(e => {return e.institute?.label}).join(' | '));
            res+=this.format(pub.authorPublications?.filter(e => e.corresponding).map(e => {return e.author.last_name+', '+e.author.first_name}).join(' | '));
            res+=this.format(pub.authorPublications?.filter(e => e.corresponding).map(e => {return e.institute?.label}).join(' | '));
            res+=this.format(pub.greater_entity);
            res+=this.format(pub.pub_date);
            res+=this.format(pub.publisher);
            res+=this.format(pub.language);
            res+=this.format(pub.oa_category);
            res+=this.format(pub.pub_type);
            res+=this.format(pub.funders?.map(e => e.label).join(' | '));
            res+=this.format(pub.contract);
            res+=this.format(pub.cost_approach);
            res+=this.format(pub.invoices?.map(e => e.number).join(' | '));
            res+=this.format(pub.invoices?.map(e => e.cost_items.map(e => e.euro_value).reduce((v,e) => v+e,0)).reduce((v,e) => v+e,0));
            res+=this.format(pub.invoices?.map(e => e.booking_amount).reduce((v,e) => v+e,0));
            res+=this.format(pub.invoices?.map(e => e.cost_center?.label).join(' | '));
            res+=this.format(pub.dataSource);
            res+=this.format(pub.second_pub);
            res+=this.format(pub.add_info);
            res+=this.format(pub.import_date);
            res+=this.format(pub.edit_date);
            if (pub.invoices.length>0) for (let ct of cost_types) {
                res+=this.format(pub.invoices?.map(e => e.cost_items.filter(e => e.cost_type && e.cost_type.id === ct.id).map(e => e.euro_value+e.vat).reduce((v,e) => v+e,0)).reduce((v,e) => v+e,0))
            }

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