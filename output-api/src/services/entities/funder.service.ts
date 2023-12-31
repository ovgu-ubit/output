import { Injectable } from '@nestjs/common';
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

    public save(pub: Funder[]) {
        return this.repository.save(pub);
    }

    public get() {
        return this.repository.find();
    }

    public one(id:number) {
        return this.repository.findOne({where:{id}, relations: {aliases:true}});
    }

    public async findOrSave(title: string, doi?: string): Promise<Funder> {
        if (!title) return null;
        let label = await this.identifyFunder(title);
        let funder: Funder;
        if (doi) funder = await this.repository.findOne({ where: { doi: ILike(doi) } });
        if (!funder) {
            funder = await this.repository.findOne({ where: { label: ILike(label) } });
            if (funder && !funder.doi && doi) funder = await this.repository.save({ id: funder.id, doi });
        }
        if (funder) return funder;
        else return await this.repository.save({ label, doi }).catch(e => { throw { origin: 'funder-service', text: `Funder ${label} with DOI ${doi} could not be inserted` }; });
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
        if(!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        let query = this.repository.createQueryBuilder("funder")
            .leftJoin("funder.publications","publication", "publication.pub_date between :beginDate and :endDate",{beginDate, endDate})
            .select("funder.id","id")
            .addSelect("funder.label","label")
            .addSelect("funder.doi","doi")
            .addSelect("COUNT(DISTINCT publication.id)","pub_count")
            .groupBy("funder.id")
            .addGroupBy("funder.label")
            .addGroupBy("funder.doi")

        //console.log(query.getSql());

        return query.getRawMany() as Promise<FunderIndex[]>;
    }

    public async combine(id1: number, ids: number[]) {
        let aut1 = await this.repository.findOne({where:{id:id1}});
        let authors = []
        for (let id of ids) {
            authors.push( await this.repository.findOne({where:{id},relations:{publications:{funders:true}}}))
        }
        
        if (!aut1 || authors.find(e => e === null || e === undefined)) return {error:'find'};
        
        let res = {...aut1};

        for (let aut of authors) {
            let pubs = [];
            for (let pub of aut.publications) {
                let newF = pub.funders? pub.funders.filter(e => e.id !==aut.id) : [];
                if (!newF.find(e => e.id === aut1.id)) newF.push(aut1);
                pubs.push({id:pub.id, funders: newF});
            }
            await this.publicationService.save(pubs)
            if (!res.label && aut.label) res.label = aut.label;
            if (!res.doi && aut.doi) res.doi = aut.doi;
        }
        
        //update publication 1
        if (await this.repository.save(res)) {
            if (await this.aliasRepository.delete({elementId: In(authors.map(e => e.id))}) && await this.repository.delete({id: In(authors.map(e => e.id))})) return res;
            else return {error:'delete'};
        } else return {error:'update'};
    }
    
    public async delete(insts:Funder[]) {
        for (let inst of insts) {
            let conE: Funder = await this.repository.findOne({where:{id:inst.id},relations:{publications:{funders:true}}});
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

