import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { Funder } from '../../entity/Funder';
import { Publisher } from '../../entity/Publisher';
import { FunderIndex } from '../../../../output-interfaces/PublicationIndex';
import { PublicationService } from './publication.service';
import { AliasFunder } from '../../entity/alias/AliasFunder';

@Injectable()
export class FunderService {

    constructor(@InjectRepository(Funder) private repository: Repository<Funder>, @InjectRepository(AliasFunder) private aliasRepository: Repository<AliasFunder>,
    private configService: ConfigService, private publicationService:PublicationService) { }

    public save(pub: any[]) {
        return this.repository.save(pub).catch(err => {
            if (err.constraint) throw new BadRequestException(err.detail)
            else throw new InternalServerErrorException(err);
        });
    }

    public get() {
        return this.repository.find();
    }

    public async one(id:number, writer:boolean) {
        let funder = await this.repository.findOne({where:{id}, relations: {aliases:true}});
        
        if (writer && !funder.locked_at) {
            await this.save([{
                id: funder.id,
                locked_at: new Date()
            }]);
        } else if (writer && (new Date().getTime() - funder.locked_at.getTime()) > this.configService.get('lock_timeout') * 60 * 1000) {
            await this.save([{
                id: funder.id,
                locked_at: null
            }]);
            return this.one(id, writer);
        }        
        return funder;
    }

    public async findOrSave(funder:Funder): Promise<Funder> {
        if (!funder.label && !funder.doi) return null;
        let label = await this.identifyFunder(funder.label);
        let funder_ent: Funder;
        if (funder.doi) funder_ent = await this.repository.findOne({ where: { doi: ILike(funder.doi) } });
        if (!funder_ent) {
            funder_ent = await this.repository.findOne({ where: { label: ILike(label) } });
            if (funder_ent && !funder_ent.doi && funder.doi) funder_ent = await this.repository.save({ id: funder_ent.id, doi: funder.doi });
        }
        if (funder_ent) return funder_ent;
        else return await this.repository.save({ label, doi: funder.doi }).catch(e => { throw { origin: 'funder-service', text: `Funder ${label} with DOI ${funder.doi} could not be inserted` }; });
    }

    public async identifyFunder(title: string) {
        let alias = await this.aliasRepository.createQueryBuilder('alias')
        .leftJoinAndSelect('alias.element', 'element')
        .where(':label ILIKE CONCAT(\'%\',alias.alias,\'%\')', { label: title })
        .getOne();

        if (alias) return alias.element.label;
        return title;
    }
    
    public async index(reporting_year:number): Promise<FunderIndex[]> {
        let query = this.repository.createQueryBuilder("funder")
            .select("funder.id","id")
            .addSelect("funder.label","label")
            .addSelect("funder.doi","doi")
            .addSelect("funder.ror_id","ror_id")
            .addSelect("COUNT(DISTINCT publication.id)","pub_count")
            .groupBy("funder.id")
            .addGroupBy("funder.label")
            .addGroupBy("funder.doi")
            .addGroupBy("funder.ror_id")

        if (reporting_year) {
            let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
            let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
            query = query
                .leftJoin("funder.publications", "publication", "publication.pub_date between :beginDate and :endDate", { beginDate, endDate })
        }
        else {
            query = query
                .leftJoin("funder.publications", "publication", "publication.pub_date IS NULL and publication.pub_date_print IS NULL and publication.pub_date_accepted IS NULL and publication.pub_date_submitted IS NULL")
        }
        //console.log(query.getSql());

        return query.getRawMany() as Promise<FunderIndex[]>;
    }

    public async combine(id1: number, ids: number[], alias_strings?: string[]) {
        let funder1 = await this.repository.findOne({where:{id:id1}, relations: {aliases: true}});
        let funders:Funder[] = []
        for (let id of ids) {
            funders.push( await this.repository.findOne({where:{id},relations:{aliases: true, publications:{funders:true}}}))
        }
        
        if (!funder1 || funders.find(e => e === null || e === undefined)) return {error:'find'};
        
        let res = {...funder1};

        for (let fund of funders) {
            let pubs = [];
            for (let pub of fund.publications) {
                let newF = pub.funders? pub.funders.filter(e => e.id !==fund.id) : [];
                if (!newF.find(e => e.id === funder1.id)) newF.push(funder1);
                pubs.push({id:pub.id, funders: newF});
            }
            for (let alias of fund.aliases) {
                //this.aliasRepository.save({elementId: res.id, alias})
                res.aliases.push({elementId: res.id, alias: alias.alias})
            }
            await this.publicationService.save(pubs)
            if (!res.label && fund.label) res.label = fund.label;
            if (!res.doi && fund.doi) res.doi = fund.doi;
        }
        //update aliases
        if (alias_strings) {
            for (let alias of alias_strings) {
                //await this.aliasRepository.save({elementId: res.id, alias})
                res.aliases.push({elementId: res.id, alias});
            }
        }
        
        //update publication 1
        if (await this.repository.save(res)) {
            if (await this.aliasRepository.delete({elementId: In(funders.map(e => e.id))}) && await this.repository.delete({id: In(funders.map(e => e.id))})) return res;
            else return {error:'delete'};
        } else return {error:'update'};
    }
    
    public async delete(insts:Funder[]) {
        for (let inst of insts) {
            let conE: Funder = await this.repository.findOne({where:{id:inst.id},relations:{publications:{funders:true}},withDeleted: true});
            let pubs = [];
            if (conE.publications) for (let pub of conE.publications) {
                pubs.push({id:pub.id, funders: pub.funders.filter(e => e.id !==conE.id)});
            }
            await this.aliasRepository.delete({elementId: conE.id});
            
            await this.publicationService.save(pubs);
        }
        return await this.repository.delete(insts.map(p => p.id));
    }
}

