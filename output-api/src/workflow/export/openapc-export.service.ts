import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { AbstractExportService } from './abstract-export.service';
import { PublicationService } from '../../publication/core/publication.service';
import { SearchFilter } from '../../../../output-interfaces/Config';
import { Publication } from '../../publication/core/Publication.entity';
import { PublicationIndex } from '../../../../output-interfaces/PublicationIndex';
import { AbstractFilterService } from '../filter/abstract-filter.service';
import { ContractService } from '../../contract/contract.service';
import { ReportItemService } from '../report-item.service';
import { AppConfigService } from '../../config/app-config.service';

@Injectable()
/**
 * abstract class for all exports
 */
export class OpenAPCExportService extends AbstractExportService {

    quote = '"';
    sep = ',';

    constructor(private publicationService: PublicationService, private reportService: ReportItemService, private configService: AppConfigService, private contractService: ContractService) {
        super();
    }

    protected name = 'OpenAPC-Export';

    public async export(filter?: { filter: SearchFilter, paths: string[] }, filterServices?: AbstractFilterService<PublicationIndex | Publication>[], by_user?: string) {
        this.status_text = 'Started on ' + new Date();
        this.report = await this.reportService.createReport('Export', this.name, by_user);

        let pubs = await this.publicationService.getAll(filter?.filter);
        if (filter) for (let path of filter.paths) {
            let so = (await this.configService.get('filter_services')).findIndex(e => e.path === path)
            if (so === -1) continue;
            pubs = await filterServices[so].filter(pubs) as Publication[]
        }

        let res = '"institution","period","euro","doi","is_hybrid","publisher","journal_full_title","url"\n';
        for (let pub of pubs) {
            let hybrid = pub.oa_category?.label.toLocaleLowerCase().includes('hybrid');
            if ((hybrid && !pub.contract) || (!hybrid && pub.invoices.length === 0)) continue;

            res += this.format(await this.configService.get("institution_label"));
            if (!hybrid) {
                res += this.format(pub.invoices[0].date?.getFullYear());
                res += this.format(pub.invoices.reduce<number>((p: number, c) => { return p + c.booking_amount }, 0));
            }
            else {
                if (pub.pub_date_accepted) res += this.format(pub.pub_date_accepted.getFullYear());
                else if (pub.pub_date) res += this.format(pub.pub_date.getFullYear());
                else if (pub.contract.start_date) res += this.format(pub.contract.start_date.getFullYear());
                let contract = await this.contractService.one(pub.contract.id, false);
                res += this.format(pub.contract.invoice_amount / contract.publications.length)
            }
            res+=this.format(pub.doi);
            res+=this.format(hybrid);
            res+=this.format(pub.publisher?.label);
            res+=this.format(pub.greater_entity?.label);
            res+=this.format(pub.link);
            res=res.slice(0,res.length-1);

            res += '\n';
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

    format(field): string {
        let res = this.quote;
        let value = field ? (field.label ? field.label : field) : '';
        if (value instanceof Date || Number.isNaN(value)) res += value.toLocaleString().slice(0, 10000);
        else res += value;
        res += this.quote;
        res += this.sep;
        return res;
    }
}