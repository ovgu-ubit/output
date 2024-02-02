import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { concatMap, defer, from, iif, Observable, of } from 'rxjs';
import { ILike, In, Repository } from 'typeorm';
import { Publisher } from '../../entity/Publisher';
import { PublisherIndex } from '../../../../output-interfaces/PublicationIndex';
import { PublicationService } from './publication.service';
import { AliasPublisher } from '../../entity/alias/AliasPublisher';

@Injectable()
export class PublisherService {

    constructor(@InjectRepository(Publisher) private repository: Repository<Publisher>, private configService: ConfigService, private publicationService: PublicationService,
        @InjectRepository(AliasPublisher) private aliasRepository: Repository<AliasPublisher>) { }

    public save(pub: Publisher[]) {
        return this.repository.save(pub);
    }

    public get() {
        return this.repository.find();
    }
    public one(id: number) {
        return this.repository.findOne({ where: { id }, relations: { aliases: true } });
    }

    public findOrSave(title: string, location?: string): Observable<Publisher> {
        if (!title) return of(null);
        return from(this.identifyPublisher(title)).pipe(concatMap(data => {
            return from(this.repository.findOne({ where: { label: ILike(data) } })).pipe(concatMap(ge => {
                return iif(() => !!ge, of(ge), defer(() => from(this.repository.save({ label:data, location }))));
            }))
        }));
    }

    public async identifyPublisher(title: string) {
        /*let concs = this.configService.get<{label:string, texts:string[]}[]>('publisherConcordance');
        for (let conc of concs) {
            for (let text of conc.texts) if (title.toLocaleLowerCase().trim().includes(text.toLocaleLowerCase().trim())) {
                return conc.label;
            }
        }
        return title;*/
        let alias = await this.aliasRepository.createQueryBuilder('alias')
            .leftJoinAndSelect('alias.element', 'element')
            .where(':label ILIKE CONCAT(\'%\',alias.alias,\'%\')', { label: title })
            .getOne();

        if (alias) return alias.element.label;
        return title;
    }

    public async index(reporting_year:number): Promise<PublisherIndex[]> {
        if(!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        let query = this.repository.createQueryBuilder("publisher")
            .leftJoin("publisher.publications", "publication", "publication.\"publisherId\" = publisher.id and publication.pub_date between :beginDate and :endDate",{beginDate, endDate})
            .select("publisher.id", "id")
            .addSelect("publisher.label", "label")
            .addSelect("publisher.location", "location")
            .addSelect("COUNT(publication.id)", "pub_count")
            .groupBy("publisher.id")
            .addGroupBy("publisher.location")
            .addGroupBy("publisher.label")

        //console.log(query.getSql());

        return query.getRawMany() as Promise<PublisherIndex[]>;
    }

    public async combine(id1: number, ids: number[], alias_strings?:string[]) {
        let aut1 = await this.repository.findOne({where:{id:id1},relations: {aliases:true}});
        let authors = []
        for (let id of ids) {
            authors.push( await this.repository.findOne({ where: { id }, relations: { publications: true, aliases: true } }))
        }
        
        if (!aut1 || authors.find(e => e === null || e === undefined)) return {error:'find'};
        
        let res = {...aut1};

        for (let aut of authors) {
            let pubs = [];
            for (let pub of aut.publications) {
                pubs.push({id:pub.id, publisher: aut1});
            }
            await this.publicationService.save(pubs)
            if (!res.label && aut.label) res.label = aut.label;
            if (!res.location && aut.location) res.location = aut.location;
            if (!res.aliases) res.aliases = [];
            res.aliases = res.aliases.concat(aut.aliases.map(e => { return { alias: e.alias, elementId: aut1.id } }))
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
            if (await this.aliasRepository.delete({elementId: In(authors.map(e => e.id))}) && await this.repository.delete({id: In(authors.map(e => e.id))})) return res;
            else return {error:'delete'};
        } else return {error:'update'};
    }

    public async delete(insts: Publisher[]) {
        for (let inst of insts) {
            let conE: Publisher = await this.repository.findOne({ where: { id: inst.id }, relations: { publications: true, aliases: true } });
            let pubs = [];
            if (conE.publications) for (let pub of conE.publications) {
                pubs.push({ id: pub.id, publisher: null })
            }

            await this.publicationService.save(pubs);
            await this.aliasRepository.delete({elementId: conE.id});
        }
        return await this.repository.delete(insts.map(p => p.id));
    }
}

