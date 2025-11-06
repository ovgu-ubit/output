import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { concatMap, defer, from, iif, Observable, of } from 'rxjs';
import { ILike, Repository } from 'typeorm';
import { PublicationService } from '../publication/core/publication.service';
import { OA_Category } from './OA_Category.entity';
import { OACategoryIndex } from '../../../output-interfaces/PublicationIndex';
import { AppConfigService } from '../config/app-config.service';
import { AbstractEntityService } from '../common/abstract-entity.service';
import { mergeEntities } from '../common/merge';

@Injectable()
export class OACategoryService extends AbstractEntityService<OA_Category> {

    constructor(
        @InjectRepository(OA_Category) repository: Repository<OA_Category>,
        configService: AppConfigService,
        private publicationService: PublicationService,
    ) {
        super(repository, configService);
    }

    public findOrSave(title: string, dryRun = false): Observable<OA_Category> {
        if (!title) return of(null);
        return from(this.repository.findOne({ where: { label: ILike(title) } })).pipe(concatMap(ge => {
            return iif(() => !!ge, of(ge), defer(() => from(dryRun ? null : this.repository.save({ label: title }))));
        }));
    }

    public async index(reporting_year: number): Promise<OACategoryIndex[]> {
        let query = this.repository.createQueryBuilder("oacat")
            .select("oacat.id", "id")
            .addSelect("oacat.label", "label")
            .addSelect("oacat.is_oa", "is_oa")
            .addSelect("COUNT(publication.id)", "pub_count")
            .groupBy("oacat.id")
            .addGroupBy("oacat.label")
            .addGroupBy("oacat.is_oa")

        if (reporting_year) {
            let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
            let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
            query = query
                .leftJoin("oacat.publications", "publication", "publication.pub_date between :beginDate and :endDate", { beginDate, endDate })
        }
        else {
            query = query
                .leftJoin("oacat.publications", "publication", "publication.pub_date IS NULL and publication.pub_date_print IS NULL and publication.pub_date_accepted IS NULL and publication.pub_date_submitted IS NULL")
        }
        //console.log(query.getSql());

        return query.getRawMany() as Promise<OACategoryIndex[]>;
    }

    public async combine(id1: number, ids: number[]) {
        return mergeEntities<OA_Category>({
            repository: this.repository,
            primaryId: id1,
            duplicateIds: ids,
            duplicateOptions: { relations: { publications: { oa_category: true } } },
            mergeContext: {
                field: 'oa_category',
                service: this.publicationService
            },
        });
    }

    public async delete(insts: OA_Category[]) {
        for (let inst of insts) {
            let conE: OA_Category = await this.repository.findOne({ where: { id: inst.id }, relations: { publications: { oa_category: true } }, withDeleted: true });
            let pubs = [];
            if (conE.publications) for (let pub of conE.publications) {
                pubs.push({ id: pub.id, oa_category: null });
            }

            await this.publicationService.save(pubs);
        }
        return await this.repository.delete(insts.map(p => p.id));
    }
}

