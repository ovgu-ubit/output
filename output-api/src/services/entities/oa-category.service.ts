import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { concatMap, defer, from, iif, Observable, of} from 'rxjs';
import { ILike, In, Repository } from 'typeorm';
import { OA_Category } from '../../entity/OA_Category';
import { OACategoryIndex } from '../../../../output-interfaces/PublicationIndex';
import { PublicationService } from './publication.service';

@Injectable()
export class OACategoryService {

    constructor(@InjectRepository(OA_Category) private repository: Repository<OA_Category>, private configService:ConfigService, private publicationService:PublicationService) { }

    public save(pub: any[]) {
        return this.repository.save(pub).catch(err => {
            if (err.constraint) throw new BadRequestException(err.detail)
            else throw new InternalServerErrorException(err);
        });
    }

    public get() {
        return this.repository.find();
    }

    public async one(id:number, writer: boolean) {
        let oa = await this.repository.findOne({where:{id}, relations: {}});
        
        if (writer && !oa.locked_at) {
            await this.save([{
                id: oa.id,
                locked_at: new Date()
            }]);
        } else if (writer && (new Date().getTime() - oa.locked_at.getTime()) > this.configService.get('lock_timeout') * 60 * 1000) {
            await this.save([{
                id: oa.id,
                locked_at: null
            }]);
            return this.one(id, writer);
        }        
        return oa;
    }

    public findOrSave(title: string): Observable<OA_Category> {        
        if (!title) return of(null);
        return from(this.repository.findOne({ where: { label: ILike(title) } })).pipe(concatMap(ge => {
            return iif(() => !!ge, of(ge), defer(() => from(this.repository.save({label:title}))));
        }));
    }
    
    public async index(reporting_year:number): Promise<OACategoryIndex[]> {
        if(!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        let query = this.repository.createQueryBuilder("oacat")
            .leftJoin("oacat.publications","publication", "publication.pub_date between :beginDate and :endDate",{beginDate, endDate})
            .select("oacat.id","id")
            .addSelect("oacat.label","label")
            .addSelect("oacat.is_oa","is_oa")
            .addSelect("COUNT(publication.id)","pub_count")
            .groupBy("oacat.id")
            .addGroupBy("oacat.label")
            .addGroupBy("oacat.is_oa")

        //console.log(query.getSql());

        return query.getRawMany() as Promise<OACategoryIndex[]>;
    }

    public async combine(id1: number, ids: number[]) {
        let aut1 = await this.repository.findOne({where:{id:id1}});
        let authors = []
        for (let id of ids) {
            authors.push( await this.repository.findOne({where:{id},relations:{publications:{oa_category:true}}}))
        }
        
        if (!aut1 || authors.find(e => e === null || e === undefined)) return {error:'find'};
        
        let res = {...aut1};

        for (let aut of authors) {
            let pubs = [];
            for (let pub of aut.publications) {
                pubs.push({id:pub.id, oa_category: aut1});
            }
            await this.publicationService.save(pubs)
            if (!res.label && aut.label) res.label = aut.label;
            if (res.is_oa === null && aut.is_oa !== null) res.is_oa = aut.is_oa;
        }
        
        //update publication 1
        if (await this.repository.save(res)) {
            if (await this.repository.delete({id: In(authors.map(e => e.id))})) return res;
            else return {error:'delete'};
        } else return {error:'update'};
    }
    
    public async delete(insts:OA_Category[]) {
        for (let inst of insts) {
            let conE: OA_Category = await this.repository.findOne({where:{id:inst.id},relations:{publications:{oa_category:true}}});
            let pubs = [];
            if (conE.publications) for (let pub of conE.publications) {
                pubs.push({id:pub.id, oa_category: null});
            }
            
            await this.publicationService.save(pubs);
        }
        return await this.repository.delete(insts.map(p => p.id));
    }
}

