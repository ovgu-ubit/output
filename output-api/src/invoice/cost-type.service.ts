import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { concatMap, defer, from, iif, Observable, of } from 'rxjs';
import { ILike, Repository } from 'typeorm';
import { CostTypeIndex } from '../../../output-interfaces/PublicationIndex';
import { AbstractEntityService } from '../common/abstract-entity.service';
import { AppConfigService } from '../config/app-config.service';
import { CostType } from './CostType.entity';

@Injectable()
export class CostTypeService extends AbstractEntityService<CostType> {
    constructor(
        @InjectRepository(CostType) repository: Repository<CostType>,
        configService: AppConfigService,
    ) {
        super(repository, configService);
    }

    public getCostTypeIndex(reporting_year: number) {
        const beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));

        const query = this.repository.createQueryBuilder("cost_type")
            .leftJoin("cost_item", "cost_item", "cost_item.\"costTypeId\"=cost_type.id")
            .leftJoin("invoice", "invoice", "cost_item.\"invoiceId\"=invoice.id")
            .leftJoin("invoice.publication", "publication", "publication.pub_date between :beginDate and :endDate", { beginDate, endDate })
            .select("cost_type.id", "id")
            .addSelect("cost_type.label", "label")
            .addSelect("COUNT(DISTINCT publication.id)", "pub_count")
            .groupBy("cost_type.id")
            .addGroupBy("cost_type.label");

        return query.getRawMany() as Promise<CostTypeIndex[]>;
    }

    public findOrSave(title: string, dryRun = false): Observable<CostType> {
        if (!title) return of(null);
        return from(this.repository.findOne({ where: { label: ILike(title) } })).pipe(concatMap((costType) => {
            return iif(() => !!costType, of(costType), defer(() => from(dryRun ? of(null) : this.repository.save({ label: title }))));
        }));
    }
}
