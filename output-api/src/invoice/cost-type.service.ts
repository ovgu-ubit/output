import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { concatMap, defer, from, iif, Observable, of } from 'rxjs';
import { ILike, Repository } from 'typeorm';
import {  CostTypeIndex  } from '@output/interfaces';
import { AbstractEntityService } from '../common/abstract-entity.service';
import { AppConfigService } from '../config/app-config.service';
import { CostType } from './CostType.entity';

@Injectable()
export class CostTypeService extends AbstractEntityService<CostType> {
    constructor(
        @InjectRepository(CostType) repository: Repository<CostType>,
        private readonly appConfigService: AppConfigService,
    ) {
        super(repository, appConfigService);
    }

    public async getCostTypeIndex(reporting_year: number, canReadNetCosts = false): Promise<CostTypeIndex[]> {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.appConfigService.get('reporting_year'));
        let query = this.repository.createQueryBuilder("cost_type")
            .leftJoin("cost_item", "cost_item", "cost_item.\"costTypeId\"=cost_type.id")
            .leftJoin("invoice", "invoice", "cost_item.\"invoiceId\"=invoice.id")
            .leftJoin("invoice.publication", "publication")
            .select("cost_type.id", "id")
            .addSelect("cost_type.label", "label")
            .addSelect("COUNT(DISTINCT publication.id)", "pub_count_total")
            .groupBy("cost_type.id")
            .addGroupBy("cost_type.label");

        if (reporting_year) {
            const beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
            const endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
            query = query
                .addSelect("COUNT(DISTINCT CASE WHEN publication.pub_date between :beginDate and :endDate THEN publication.id ELSE NULL END)", "pub_count")
                .addSelect(canReadNetCosts ? "SUM(CASE WHEN publication.pub_date between :beginDate and :endDate THEN CASE WHEN cost_item.euro_value IS NULL THEN 0 ELSE cost_item.euro_value END ELSE 0 END)" : "NULL", "net_costs")
                .setParameters({ beginDate, endDate });
        }
        else {
            query = query
                .addSelect("COUNT(DISTINCT CASE WHEN publication.id IS NOT NULL and publication.pub_date IS NULL and publication.pub_date_print IS NULL and publication.pub_date_accepted IS NULL and publication.pub_date_submitted IS NULL THEN publication.id ELSE NULL END)", "pub_count")
                .addSelect(canReadNetCosts ? "SUM(CASE WHEN publication.id IS NOT NULL and publication.pub_date IS NULL and publication.pub_date_print IS NULL and publication.pub_date_accepted IS NULL and publication.pub_date_submitted IS NULL THEN CASE WHEN cost_item.euro_value IS NULL THEN 0 ELSE cost_item.euro_value END ELSE 0 END)" : "NULL", "net_costs");
        }

        return query.getRawMany() as Promise<CostTypeIndex[]>;
    }

    public findOrSave(title: string, dryRun = false): Observable<CostType> {
        if (!title) return of(null);
        return from(this.repository.findOne({ where: { label: ILike(title) } })).pipe(concatMap((costType) => {
            return iif(() => !!costType, of(costType), defer(() => from(dryRun ? of(null) : this.repository.save({ label: title }))));
        }));
    }
}
