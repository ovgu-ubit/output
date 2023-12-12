import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { AbstractExportService } from './abstract-export.service';
import { PublicationService } from '../entities/publication.service';
import { ReportItemService } from '../report-item.service';

@Injectable()
/**
 * abstract class for all exports
 */
export class MasterExportService extends AbstractExportService {

    quote = '"';
    sep = ';';

    constructor(private publicationService:PublicationService, private reportService:ReportItemService) {
        super(); 
    }

    protected name = 'Master-Export';

    public async export(by_user?: string) {
        this.status_text = 'Started on ' + new Date();
        this.report = this.reportService.createReport('Export',this.name, by_user);

        let pubs = await this.publicationService.get({relations: {
            oa_category: true,
            invoices: {
                cost_items: true
            },
            authorPublications: {
                author: true,
                institute: true
            },
            greater_entity: true,
            pub_type: true,
            publisher: true,
            contract: true,
            funders: true
        }});
        let res = "id;title;doi;authors;authors_inst;corr_authors;greater_entity;publisher;oa_category;pub_type;funders;contract;costs\n";
        for (let pub of pubs) {
            res+=this.format(pub.id);
            res+=this.format(pub.title);
            res+=this.format(pub.doi);
            res+=this.format(pub.authors);
            res+=this.format(pub.authorPublications?.map(e => {return e.author.last_name+', '+e.author.first_name}).join(' | '));
            res+=this.format(pub.authorPublications?.filter(e => e.corresponding).map(e => {return e.author.last_name+', '+e.author.first_name}).join(' | '));
            res+=this.format(pub.greater_entity);
            res+=this.format(pub.publisher);
            res+=this.format(pub.oa_category);
            res+=this.format(pub.pub_type);
            res+=this.format(pub.funders?.map(e => e.label).join(' | '));
            res+=this.format(pub.contract);
            res+=this.format(pub.invoices?.map(e => e.cost_items.map(e => e.euro_value).reduce((v,e) => v+e,0)).reduce((v,e) => v+e,0));
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
        res += value.toString().slice(0,10000);
        res += this.quote;
        res += this.sep;
        return res;
    }
}