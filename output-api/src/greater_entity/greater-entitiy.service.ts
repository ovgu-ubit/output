import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, FindOptionsRelations, ILike, In, Repository } from 'typeorm';
import { AppError } from '../../../output-interfaces/Config';
import { GreaterEntityIndex } from '../../../output-interfaces/PublicationIndex';
import { GreaterEntity } from './GreaterEntity';
import { GEIdentifier } from './GEIdentifier';
import { Publication } from '../publication/core/Publication';
import { PublicationService } from '../publication/core/publication.service';
import { AppConfigService } from '../config/app-config.service';
import { AbstractEntityService } from '../common/abstract-entity.service';
import { mergeEntities } from '../common/merge';

@Injectable()
export class GreaterEntityService extends AbstractEntityService<GreaterEntity> {

    constructor(
        @InjectRepository(GreaterEntity) repository: Repository<GreaterEntity>,
        @InjectRepository(GEIdentifier) private idRepository: Repository<GEIdentifier>,
        private publicationService: PublicationService,
        configService: AppConfigService,
    ) {
        super(repository, configService);
    }

    protected override getFindManyOptions(): FindManyOptions<GreaterEntity> {
        return { relations: { identifiers: true } };
    }

    protected override getFindOneRelations(): FindOptionsRelations<GreaterEntity> {
        return { identifiers: true };
    }

    public async save(pub: GreaterEntity) {
        return this.update(pub);
    }

    public async update(ge: any) {
        let orig: GreaterEntity = null;
        if (ge.id) orig = await this.repository.findOne({ where: { id: ge.id }, relations: { identifiers: true } })
        if (ge.identifiers) {
            for (let id of ge.identifiers) {
                if (!id.id) {
                    id.value = id.value.toUpperCase();
                    id.type = id.type.toLowerCase();
                    id.id = (await this.idRepository.save(id).catch(err => {
                        if (err.constraint) throw new BadRequestException(err.detail)
                        else throw new InternalServerErrorException(err);
                    })).id;
                }
            }
        }
        if (ge.identifiers && orig && orig.identifiers) orig.identifiers.forEach(async id => {
            if (!ge.identifiers.find(e => e.id === id.id)) await this.idRepository.delete(id.id)
        })

        return await this.repository.save(ge).catch(err => {
            if (err.constraint) throw new BadRequestException(err.detail)
            else throw new InternalServerErrorException(err);
        });
    }

    public async findOrSave(ge: GreaterEntity): Promise<GreaterEntity> {
        if (!ge.label && !ge.identifiers) return null;
        let result = null;
        let ids2save = [];
        //1. find an existing entity
        //find via identifier
        if (ge.identifiers && ge.identifiers.length > 0) {
            for (let { type, value } of ge.identifiers) {
                let id = await this.idRepository.findOne({
                    where: { value: ILike(value) },
                    relations: { entity: { identifiers: true } }
                });
                //if you find it, you got the entity
                if (result && id && id.entity.id !== result.id) throw { origin: 'GE-Service', text: 'amibiguous id ' + id.value + ': ge ' + result.label + ' or ' + id.entity.label } as AppError;
                if (id) result = id.entity;
                else ids2save.push({ type, value });
            }
        }
        if (!result && ge.label) {
            //find via title
            let results = await this.repository.find({ where: { label: ILike(ge.label) } });
            if (results.length > 1) throw { origin: 'GE-Service', text: 'amibiguous GE title ' + ge.label } as AppError;
            else if (results.length === 1) result = results[0];
        }
        //2. if found, possibly enrich
        if (result) {
            //doaj info
            let flag = false;
            if (ge.doaj_since && !result.doaj_since) { result.doaj_since = ge.doaj_since; flag = true; }
            if (ge.doaj_until && result.doaj_since && !result.doaj_until) { result.doaj_until = ge.doaj_until; flag = true; }
            if (flag) await this.repository.save(result)

            //find associated ids
            let ids = await this.idRepository.find({ where: { entity: result }, relations: { entity: true } })
            if (ge.identifiers && ge.identifiers.length > 0) {
                ids2save = ge.identifiers.filter(i => !ids.find(e => e.value === i.value));
            }
            if (ids2save.length > 0) await this.idRepository.save(ids2save.map(e => { return { ...e, entity: result } }));
            return result;
        } else { //3. if not found, save
            result = await this.repository.save({ label: ge.label });
            if (result && ge.identifiers) await this.idRepository.save(ge.identifiers.map(e => { return { ...e, entity: result } }));
            return result;
        }
    }

    public async index(reporting_year: number): Promise<GreaterEntityIndex[]> {
        let query = this.repository.manager.createQueryBuilder()
            .from((sq) => sq
                .from("greater_entity", "ge")
                .leftJoin("ge.identifiers", "identifier")
                .select("ge.id", "id")
                .addSelect("ge.label", "label")
                .addSelect("ge.rating", "rating")
                .addSelect("ge.doaj_since", "doaj_since")
                .addSelect("ge.doaj_until", "doaj_until")
                .addSelect("STRING_AGG(identifier.value, '; ')", "identifiers")
                //.addSelect("STRING_AGG(CONCAT(identifier.value,'(',identifier.type,')'), '; ')","identifiers")
                .groupBy("ge.id")
                .addGroupBy("ge.label")
                .addGroupBy("ge.rating")
                , "a")
            .select("a.id", "id")
            .addSelect("a.label", "label")
            .addSelect("a.rating", "rating")
            .addSelect("a.doaj_since", "doaj_since")
            .addSelect("a.doaj_until", "doaj_until")
            .addSelect("a.identifiers", "identifiers")
            .addSelect("COUNT(\"publication\")", "pub_count_total")
            .groupBy("a.id")
            .addGroupBy("a.label")
            .addGroupBy("a.rating")
            .addGroupBy("a.doaj_since")
            .addGroupBy("a.doaj_until")
            .addGroupBy("a.identifiers")
            .leftJoin(Publication, "publication", "publication.\"greaterEntityId\" = a.id")

        if (reporting_year) {
            let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
            let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
            query = query
                .addSelect("SUM(CASE WHEN publication.pub_date >= '" + beginDate.toISOString() + "' and publication.pub_date <= '" + endDate.toISOString() + "' THEN 1 ELSE 0 END)", "pub_count")
        }
        else {
            query = query
                .addSelect("SUM(CASE WHEN publication.pub_date is null THEN 1 ELSE 0 END)", "pub_count")
        }
        //console.log(query.getSql());

        return query.getRawMany() as Promise<GreaterEntityIndex[]>;
    }

    public async combine(id1: number, ids: number[]) {
        return mergeEntities<GreaterEntity>({
            repository: this.repository,
            primaryId: id1,
            duplicateIds: ids,
            primaryRelations: { identifiers: true },
            duplicateRelations: { identifiers: true, publications: true },
            initializeAccumulator: (primary) => ({
                ...primary,
                identifiers: [...(primary.identifiers ?? [])],
            }) as GreaterEntity,
            mergeDuplicate: async ({ primary, duplicate, accumulator }) => {
                const pubs = duplicate.publications?.map(pub => ({ id: pub.id, greater_entity: primary })) ?? [];
                if (pubs.length > 0) {
                    await this.publicationService.save(pubs);
                }

                if (!accumulator.label && duplicate.label) accumulator.label = duplicate.label;
                if (!accumulator.rating && duplicate.rating) accumulator.rating = duplicate.rating;
                if (accumulator.doaj_since === null && duplicate.doaj_since !== null) accumulator.doaj_since = duplicate.doaj_since;
                if (accumulator.doaj_until === null && duplicate.doaj_until !== null) accumulator.doaj_until = duplicate.doaj_until;

                accumulator.identifiers = accumulator.identifiers.concat(duplicate.identifiers ?? []);
            },
            afterSave: async ({ duplicateIds, defaultDelete }) => {
                if (duplicateIds.length > 0) {
                    await this.idRepository.delete({ entity: { id: In(duplicateIds) } });
                }

                await defaultDelete();
            },
        });
    }

    public async delete(insts: GreaterEntity[]) {
        for (let inst of insts) {
            let conE: GreaterEntity = await this.repository.findOne({ where: { id: inst.id }, relations: { identifiers: true, publications: true }, withDeleted: true });
            let pubs = [];
            if (conE.publications) for (let pub of conE.publications) {
                pubs.push({ id: pub.id, greater_entity: null })
            }
            if (pubs.length > 0) await this.publicationService.save(pubs);

            let ides = [];
            if (conE.identifiers) for (let ide of conE.identifiers) {
                ides.push(ide.id)
            }
            if (ides.length > 0) await this.idRepository.delete(ides)

        }
        return await this.repository.delete(insts.map(p => p.id));
    }
}

