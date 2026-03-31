import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { concatMap, defer, from, iif, Observable, of } from 'rxjs';
import { ILike, Repository } from 'typeorm';
import { CostCenterIndex } from '../../../output-interfaces/PublicationIndex';
import { AbstractEntityService } from '../common/abstract-entity.service';
import { AppConfigService } from '../config/app-config.service';
import { CostCenter } from './CostCenter.entity';

@Injectable()
export class CostCenterService extends AbstractEntityService<CostCenter> {
    constructor(
        @InjectRepository(CostCenter) repository: Repository<CostCenter>,
        private readonly appConfigService: AppConfigService,
    ) {
        super(repository, appConfigService);
    }

    public async getCostCenterIndex(reporting_year: number): Promise<CostCenterIndex[]> {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.appConfigService.get('reporting_year'));
        const beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        const query = this.repository.createQueryBuilder("cost_center")
            .leftJoin("invoice", "invoice", "invoice.\"costCenterId\"=cost_center.id")
            .leftJoin("invoice.publication", "publication", "publication.pub_date between :beginDate and :endDate", { beginDate, endDate })
            .select("cost_center.id", "id")
            .addSelect("cost_center.label", "label")
            .addSelect("cost_center.number", "number")
            .addSelect("COUNT(DISTINCT publication.id)", "pub_count")
            .groupBy("cost_center.id")
            .addGroupBy("cost_center.label")
            .addGroupBy("cost_center.number");

        return query.getRawMany() as Promise<CostCenterIndex[]>;
    }

    public findOrSave(title: string, dryRun = false): Observable<CostCenter> {
        if (!title) return of(null);
        return from(this.repository.findOne({ where: [{ label: ILike(title) }, { number: ILike(title) }] })).pipe(concatMap((costCenter) => {
            return iif(() => !!costCenter, of(costCenter), defer(() => from(dryRun ? of(null) : this.repository.save({ label: title }))));
        }));
    }
}
