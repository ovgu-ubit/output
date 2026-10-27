import { addInvoiceAmounts } from './invoice-costs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { concatMap, defer, from, iif, Observable, of } from 'rxjs';
import { ILike, Repository } from 'typeorm';
import {  CostCenterIndex  } from '@output/interfaces';
import { AbstractEntityService } from '../common/abstract-entity.service';
import { AppConfigService } from '../config/app-config.service';
import { CostCenter } from './CostCenter.entity';
import { addInvoiceCounts, normalizeInvoiceCounts } from './invoice-counts';

@Injectable()
export class CostCenterService extends AbstractEntityService<CostCenter> {
    constructor(
        @InjectRepository(CostCenter) repository: Repository<CostCenter>,
        private readonly appConfigService: AppConfigService,
    ) {
        super(repository, appConfigService);
    }

    public async getCostCenterIndex(reporting_year: number, canReadNetCosts = false, canReadInvoices = false): Promise<CostCenterIndex[]> {
        // Preserve "undated" for invoices independently of the legacy publication-year fallback.
        const invoiceReportingYear = reporting_year;
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.appConfigService.get('reporting_year'));
        let query = this.repository.createQueryBuilder("cost_center")
            .leftJoin("invoice", "invoice", "invoice.\"costCenterId\"=cost_center.id")
            .leftJoin("invoice.publication", "publication")
            .select("cost_center.id", "id")
            .addSelect("cost_center.label", "label")
            .addSelect("cost_center.number", "number")
            .addSelect("COUNT(DISTINCT publication.id)", "pub_count_total")
            .groupBy("cost_center.id")
            .addGroupBy("cost_center.label")
            .addGroupBy("cost_center.number");

        if (canReadNetCosts) {
            query = addInvoiceAmounts(query);
        }

        if (reporting_year) {
            const beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
            const endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
            query = query
                .addSelect("COUNT(DISTINCT CASE WHEN publication.pub_date between :beginDate and :endDate THEN publication.id ELSE NULL END)", "pub_count")
                .addSelect(canReadNetCosts ? "SUM(CASE WHEN publication.pub_date between :beginDate and :endDate THEN COALESCE(invoice_amounts.gross_amount, 0) ELSE 0 END)" : "NULL", "net_costs")
                .setParameters({ beginDate, endDate });
        }
        else {
            query = query
                .addSelect("COUNT(DISTINCT CASE WHEN publication.id IS NOT NULL and publication.pub_date IS NULL and publication.pub_date_print IS NULL and publication.pub_date_accepted IS NULL and publication.pub_date_submitted IS NULL THEN publication.id ELSE NULL END)", "pub_count")
                .addSelect(canReadNetCosts ? "SUM(CASE WHEN publication.id IS NOT NULL and publication.pub_date IS NULL and publication.pub_date_print IS NULL and publication.pub_date_accepted IS NULL and publication.pub_date_submitted IS NULL THEN COALESCE(invoice_amounts.gross_amount, 0) ELSE 0 END)" : "NULL", "net_costs");
        }

        if (canReadInvoices) addInvoiceCounts(query, 'cost_center_id', invoiceReportingYear);
        const rows = await query.getRawMany<CostCenterIndex>();
        return canReadInvoices ? normalizeInvoiceCounts(rows) : rows;
    }

    public findOrSave(title: string, dryRun = false): Observable<CostCenter> {
        if (!title) return of(null);
        return from(this.repository.findOne({ where: [{ label: ILike(title) }, { number: ILike(title) }] })).pipe(concatMap((costCenter) => {
            return iif(() => !!costCenter, of(costCenter), defer(() => from(dryRun ? of(null) : this.repository.save({ label: title }))));
        }));
    }
}
