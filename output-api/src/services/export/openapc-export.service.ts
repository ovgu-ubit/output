import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { AbstractExportService } from './abstract-export.service';
import { PublicationService } from '../entities/publication.service';
import { ReportItemService } from '../report-item.service';
import { SearchFilter } from '../../../../output-interfaces/Config';
import { Publication } from '../../entity/Publication';
import { PublicationIndex } from '../../../../output-interfaces/PublicationIndex';
import { AbstractFilterService } from '../filter/abstract-filter.service';
import { ConfigService } from '@nestjs/config';
import { ContractService } from '../entities/contract.service';

@Injectable()
/**
 * abstract class for all exports
 */
export class OpenAPCExportService extends AbstractExportService {

    quote = '"';
    sep = ',';

    constructor(private publicationService:PublicationService, private reportService:ReportItemService, private configService:ConfigService, private contractService:ContractService) {
        super(); 
    }

    protected name = 'OpenAPC-Export';

    public async export(filter?:{filter:SearchFilter, paths:string[]}, filterServices?:AbstractFilterService<PublicationIndex|Publication>[], by_user?: string) {
        this.status_text = 'Started on ' + new Date();
        this.report = this.reportService.createReport('Export',this.name, by_user);

        let pubs = await this.publicationService.getAll(filter?.filter);
        if (filter) for (let path of filter.paths) {
            let so = this.configService.get('filter_services').findIndex(e => e.path === path)
            if (so === -1) continue;
            pubs = await filterServices[so].filter(pubs) as Publication[]
        }

        let res = '"institution","period","euro","doi","is_hybrid","publisher","journal_full_title","url"\n';
        for (let pub of pubs) {
            let hybrid = pub.oa_category?.label.toLocaleLowerCase().includes('hybrid');
            if ((hybrid && !pub.contract) || (!hybrid && pub.invoices.length === 0)) continue;

            res+=this.format(this.configService.get("institution_label"));
            if (!hybrid) {
                res+=this.format(pub.invoices[0].date?.getFullYear());
                res+=this.format(pub.invoices.reduce<number>((p:number,c) => {return p + c.booking_amount}, 0));
            }
            else {
                if (pub.contract.start_date) res+=this.format(pub.contract.start_date?.getFullYear());
                let contract = await this.contractService.one(pub.contract.id, false);
                res+=this.format(pub.contract.invoice_amount / contract.publications.length)
            }
            res+=this.format(pub.doi);
            res+=this.format(hybrid);
            res+=this.format(pub.publisher.label);
            res+=this.format(pub.greater_entity.label);
            res+=this.format(pub.link);
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
        if (value instanceof Date || Number.isNaN(value)) res += value.toLocaleString().slice(0,10000);
        else res += value;
        res += this.quote;
        res += this.sep;
        return res;
    }
}