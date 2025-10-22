import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, ILike, In, Repository } from 'typeorm';
import { PublicationTypeIndex } from '../../../output-interfaces/PublicationIndex';
import { AliasPubType } from './AliasPubType';
import { PublicationService } from '../publication/core/publication.service';
import { PublicationType } from './PublicationType';
import { AppConfigService } from '../config/app-config.service';
import { AbstractEntityService } from '../common/abstract-entity.service';

@Injectable()
export class PublicationTypeService extends AbstractEntityService<PublicationType> {

    constructor(
        @InjectRepository(PublicationType) repository: Repository<PublicationType>,
        @InjectRepository(AliasPubType) private aliasRepository:Repository<AliasPubType>,
        configService:AppConfigService,
        private publicationService:PublicationService,
    ) {
        super(repository, configService);
    }

    protected override getFindOneRelations(): FindOptionsRelations<PublicationType> {
        return { aliases: true };
    }

    public async findOrSave(title: string): Promise<PublicationType> {        
        if (!title) return null;
        let label = await this.identifyPublicationType(title);

        let pubtype = await this.repository.findOne({ where: { label: ILike(label) } });
        
        if (pubtype) return pubtype;
        else return await this.repository.save({ label }).catch(e => { throw { origin: 'pubType-service', text: `PubType ${label} could not be inserted` }; });
    }

    public async identifyPublicationType(title: string) {
        let alias = await this.aliasRepository.createQueryBuilder('alias')
        .leftJoinAndSelect('alias.element', 'element')
        .where(':label ILIKE CONCAT(\'%\',alias.alias,\'%\')', { label: title })
        .getMany();

        if (alias && alias.length === 1) return alias[0].element.label;
        else if (alias && alias.length > 1) {
            //console.log('ambigious ptype alias '+title+', first type is assigned: '+alias.map(e=> e.element.label).join(', '))
            return alias[0].element.label;
        }
        return title;
    }

    public async index(reporting_year:number): Promise<PublicationTypeIndex[]> {
        let query = this.repository.createQueryBuilder("type")
            .select("type.id","id")
            .addSelect("type.label","label")
            .addSelect("type.review","review")
            .addSelect("COUNT(publication.id)","pub_count")
            .groupBy("type.id")
            .addGroupBy("type.label")
            .addGroupBy("type.review")

        if (reporting_year) {
            let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
            let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
            query = query
                .leftJoin("type.publications", "publication", "publication.pub_date between :beginDate and :endDate", { beginDate, endDate })
        }
        else {
            query = query
                .leftJoin("type.publications", "publication", "publication.pub_date IS NULL and publication.pub_date_print IS NULL and publication.pub_date_accepted IS NULL and publication.pub_date_submitted IS NULL")
        }
        //console.log(query.getSql());

        return query.getRawMany() as Promise<PublicationTypeIndex[]>;
    }

    public async combine(id1: number, ids: number[], alias_strings?:string[]) {
        let aut1 = await this.repository.findOne({where:{id:id1}, relations: {aliases:true}});
        let authors = []
        for (let id of ids) {
            authors.push( await this.repository.findOne({where:{id},relations:{publications:{pub_type:true}, aliases: true}}))
        }
        
        if (!aut1 || authors.find(e => e === null || e === undefined)) return {error:'find'};
        
        let res = {...aut1};

        for (let aut of authors) {
            let pubs = [];
            for (let pub of aut.publications) {
                pubs.push({id:pub.id, pub_type: aut1});
            }
            await this.publicationService.save(pubs)
            if (!res.label && aut.label) res.label = aut.label;
            if (res.review === null && aut.review !== null) res.review = aut.review;
            for (let alias of aut.aliases) {
                res.aliases.push({elementId: res.id, alias: alias.alias})
            }
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
            if (await this.aliasRepository.delete({elementId: In(authors.map(e => e.id))}) &&  this.repository.delete({id: In(authors.map(e => e.id))})) return res;
            else return {error:'delete'};
        } else return {error:'update'};
    }
    
    public async delete(insts:PublicationType[]) {
        for (let inst of insts) {
            let conE: PublicationType = await this.repository.findOne({where:{id:inst.id},relations:{publications:{pub_type:true}},withDeleted: true});
            let pubs = [];
            if (conE.publications) for (let pub of conE.publications) {
                pubs.push({id:pub.id, pub_type: null});
            }
            
            await this.publicationService.save(pubs);
            await this.aliasRepository.delete({elementId: conE.id});
        }
        return await this.repository.delete(insts.map(p => p.id));
    }
}

