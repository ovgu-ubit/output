import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { AppError } from '../../../../output-interfaces/Config';
import { GreaterEntityIndex } from '../../../../output-interfaces/PublicationIndex';
import { GreaterEntity } from '../../entity/GreaterEntity';
import { Identifier } from '../../entity/Identifier';
import { Publication } from '../../entity/Publication';
import { PublicationService } from './publication.service';

@Injectable()
export class GreaterEntityService {

    constructor(@InjectRepository(GreaterEntity) private repository: Repository<GreaterEntity>,
        @InjectRepository(Identifier) private idRepository: Repository<Identifier>, private publicationService:PublicationService,
        private configService:ConfigService) { }

    public async save(pubs: any[]) {
        for (let pub of pubs) {
            if (!pub.id) pub.id = undefined;
            if (pub.identifiers) {
                for (let id of pub.identifiers) {
                    id.value = id.value.toUpperCase();
                    id.type = id.type.toLowerCase();
                    id.id = (await this.idRepository.save(id).catch(err => {
                        if (err.constraint) throw new BadRequestException(err.detail)
                        else throw new InternalServerErrorException(err);
                    })).id;
                }
            }
        }
        return await this.repository.save(pubs).catch(err => {
            if (err.constraint) throw new BadRequestException(err.detail)
            else throw new InternalServerErrorException(err);
        });
    }

    public get() {
        return this.repository.find({relations: {identifiers:true}});
    }

    public async one(id:number, writer:boolean) {
        let ge = await this.repository.findOne({where: {id},relations: {identifiers:true}});
        
        if (writer && !ge.locked_at) {
            await this.save([{
                id: ge.id,
                locked_at: new Date()
            }]);
        } else if (writer && (new Date().getTime() - ge.locked_at.getTime()) > this.configService.get('lock_timeout') * 60 * 1000) {
            await this.save([{
                id: ge.id,
                locked_at: null
            }]);
            return this.one(id, writer);
        }        
        return ge;
    }

    public async findOrSave(ge:GreaterEntity): Promise<GreaterEntity> {
        if (!ge.label && !ge.identifiers) return null;
        let result = null;
        let ids2save = [];
        //1. find an existing entity
        //find via identifier
        if (ge.identifiers && ge.identifiers.length > 0) {
            for (let { type, value } of ge.identifiers) {
                let id = await this.idRepository.findOne({
                    where: { value: ILike(value) },
                    relations: { entity: {identifiers:true} }
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
            if (ge.doaj_since && !result.doaj_since) {result.doaj_since = ge.doaj_since;flag=true;}
            if (ge.doaj_until && result.doaj_since && !result.doaj_until) {result.doaj_until = ge.doaj_until;flag=true;}
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

    public async index(reporting_year:number): Promise<GreaterEntityIndex[]> {
        if(!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        let query = this.repository.manager.createQueryBuilder()
            .from((sq) => sq
                .from("greater_entity", "ge")
                .leftJoin("ge.identifiers","identifier")
                .select("ge.id","id")
                .addSelect("ge.label","label")
                .addSelect("ge.rating","rating")
                .addSelect("ge.doaj_since","doaj_since")
                .addSelect("ge.doaj_until","doaj_until")
                .addSelect("STRING_AGG(identifier.value, '; ')","identifiers")
                //.addSelect("STRING_AGG(CONCAT(identifier.value,'(',identifier.type,')'), '; ')","identifiers")
                .groupBy("ge.id")
                .addGroupBy("ge.label")
                .addGroupBy("ge.rating")
                , "a")
            .leftJoin(Publication, "publication", "publication.\"greaterEntityId\" = a.id and publication.pub_date between :beginDate and :endDate",{beginDate, endDate} )
            .select("a.id", "id")
            .addSelect("a.label", "label")
            .addSelect("a.rating", "rating")
            .addSelect("a.doaj_since", "doaj_since")
            .addSelect("a.doaj_until", "doaj_until")
            .addSelect("a.identifiers", "identifiers")
            .addSelect("COUNT(\"publication\")", "pub_count")
            .groupBy("a.id")
            .addGroupBy("a.label")
            .addGroupBy("a.rating")
            .addGroupBy("a.doaj_since")
            .addGroupBy("a.doaj_until")
            .addGroupBy("a.identifiers")

        //console.log(query.getSql());

        return query.getRawMany() as Promise<GreaterEntityIndex[]>;
    }

    public async combine(id1: number, ids: number[]) {
        let aut1 = await this.repository.findOne({where:{id:id1}, relations: {identifiers: true}});
        let authors = []
        for (let id of ids) {
            authors.push( await this.repository.findOne({where:{id},relations:{identifiers: true, publications:true}}))
        }
        
        if (!aut1 || authors.find(e => e === null || e === undefined)) return {error:'find'};
        
        let res = {...aut1};

        for (let aut of authors) {
            let pubs = [];
            for (let pub of aut.publications) {
                pubs.push({id:pub.id, greater_entity: aut1})
            }
            await this.publicationService.save(pubs)
            if (!res.label && aut.label) res.label = aut.label;
            if (!res.rating && aut.rating) res.rating = aut.rating;
            if (res.doaj_since === null && aut.doaj_since !== null) res.doaj_since = aut.doaj_since;
            if (res.doaj_until === null && aut.doaj_until !== null) res.doaj_until = aut.doaj_until;
            if (!res.identifiers) res.identifiers = [];
            res.identifiers = res.identifiers.concat(aut.identifiers/*.map(e => {return {...e,entity:aut1}})*/)
        }
        
        //update publication 1
        if (await this.repository.save(res)) {
            if (await this.idRepository.delete({entity: {id: In(authors.map(e => e.id))}}) && await this.repository.delete({id: In(authors.map(e => e.id))})) return res;
            else return {error:'delete'};
        } else return {error:'update'};
/*
        let ides = [];
        if (pub2.identifiers) for (let ide of pub2.identifiers) {
            ides.push(ide.id)
        }
        if (ides.length>0) await this.idRepository.delete(ides)*/
        
    }
    
    public async delete(insts:GreaterEntity[]) {
        for (let inst of insts) {
            let conE: GreaterEntity = await this.repository.findOne({where:{id:inst.id},relations:{identifiers:true, publications:true},withDeleted: true});
            let pubs = [];
            if (conE.publications) for (let pub of conE.publications) {
                pubs.push({id:pub.id, greater_entity: null})
            }
            if (pubs.length>0) await this.publicationService.save(pubs);

            let ides = [];
            if (conE.identifiers) for (let ide of conE.identifiers) {
                ides.push(ide.id)
            }
            if (ides.length>0) await this.idRepository.delete(ides)
            
        }
        return await this.repository.delete(insts.map(p => p.id));
    }
}

