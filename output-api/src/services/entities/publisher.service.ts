import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { concatMap, defer, from, iif, Observable, of } from 'rxjs';
import { ILike, In, Repository } from 'typeorm';
import { Publisher } from '../../entity/Publisher';
import { PublisherIndex } from '../../../../output-interfaces/PublicationIndex';
import { PublicationService } from './publication.service';
import { AliasPublisher } from '../../entity/alias/AliasPublisher';
import { PublisherDOI } from '../../entity/PublisherDOI';
import { Publication } from '../../entity/Publication';

@Injectable()
export class PublisherService {

    constructor(@InjectRepository(Publisher) private repository: Repository<Publisher>, private configService: ConfigService, private publicationService: PublicationService,
        @InjectRepository(AliasPublisher) private aliasRepository: Repository<AliasPublisher>) { }

    public save(pub: any[]) {
        return this.repository.save(pub).catch(err => {
            if (err.constraint) throw new BadRequestException(err.detail)
            else throw new InternalServerErrorException(err);
        });
    }

    public get() {
        return this.repository.find();
    }
    public async one(id: number, writer: boolean) {
        let publisher = await this.repository.findOne({ where: { id }, relations: { aliases: true, doi_prefixes: true } });

        if (writer && !publisher.locked_at) {
            await this.save([{
                id: publisher.id,
                locked_at: new Date()
            }]);
        } else if (writer && (new Date().getTime() - publisher.locked_at.getTime()) > this.configService.get('lock_timeout') * 60 * 1000) {
            await this.save([{
                id: publisher.id,
                locked_at: null
            }]);
            return this.one(id, writer);
        }
        return publisher;
    }

    public async findOrSave(publisher:Publisher): Promise<Publisher> {
        if (!publisher.label) return null;
        let label = await this.identifyPublisher(publisher.label);
        let publisher_ent: Publisher;
        publisher_ent = await this.repository.findOne({ where: { label: ILike(label) } })
        if (!publisher_ent && publisher.doi_prefixes) {
            publisher_ent = await this.repository.findOne({ where: { doi_prefixes: { doi_prefix: In(publisher.doi_prefixes.map(e => e.doi_prefix)) } }, relations: { doi_prefixes: true } })
        }
        if (publisher_ent) return publisher_ent;
        else return this.repository.save({ label, doi_prefixes:publisher.doi_prefixes });
    }

    public async identifyPublisher(title: string) {
        let alias = await this.aliasRepository.createQueryBuilder('alias')
            .leftJoinAndSelect('alias.element', 'element')
            .where(':label ILIKE CONCAT(\'%\',alias.alias,\'%\')', { label: title })
            .getOne();

        if (alias) return alias.element.label;
        return title;
    }

    public async findByDOI(doi: string) {
        let regex = /(10.*)\//g;
        let found = doi.match(regex);
        let doi_search = found[0].slice(0, found[0].length - 1);
        return await this.repository.findOne({ where: { doi_prefixes: { doi_prefix: ILike(doi_search) } }, relations: { doi_prefixes: true } })
    }

    public async index(reporting_year: number): Promise<PublisherIndex[]> {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));

        let query = this.repository.manager.createQueryBuilder()
            .from((sq) => sq
                .from("publisher", "publisher")
                .leftJoin("publisher.doi_prefixes", "doi_prefix")
                .select("publisher.id", "id")
                .addSelect("publisher.label", "label")
                .addSelect("STRING_AGG(DISTINCT doi_prefix.doi_prefix, ';')", "doi_prefix")
                .groupBy("publisher.id")
                .addGroupBy("publisher.label")
            , "a")
            .leftJoin(Publication, "publication", "publication.\"publisherId\" = a.id and publication.pub_date between :beginDate and :endDate", { beginDate, endDate })
            .select("a.id", "id")
            .addSelect("a.label", "label")
            .addSelect("a.doi_prefix", "doi_prefix")      
            .addSelect("COUNT(publication.id)", "pub_count")
            .groupBy("a.id")
            .addGroupBy("a.label")
            .addGroupBy("a.doi_prefix")

        //console.log(query.getSql());

        return query.getRawMany() as Promise<PublisherIndex[]>;
    }

    public async combine(id1: number, ids: number[], alias_strings?: string[]) {
        let aut1 = await this.repository.findOne({ where: { id: id1 }, relations: { aliases: true } });
        let authors = []
        for (let id of ids) {
            authors.push(await this.repository.findOne({ where: { id }, relations: { publications: true, aliases: true } }))
        }

        if (!aut1 || authors.find(e => e === null || e === undefined)) return { error: 'find' };

        let res = { ...aut1 };

        for (let aut of authors) {
            let pubs = [];
            for (let pub of aut.publications) {
                pubs.push({ id: pub.id, publisher: aut1 });
            }
            await this.publicationService.save(pubs)
            if (!res.label && aut.label) res.label = aut.label;
            if (!res.aliases) res.aliases = [];
            res.aliases = res.aliases.concat(aut.aliases.map(e => { return { alias: e.alias, elementId: aut1.id } }))
        }
        //update aliases
        if (alias_strings) {
            for (let alias of alias_strings) {
                //await this.aliasRepository.save({elementId: res.id, alias})
                res.aliases.push({ elementId: res.id, alias });
            }
        }

        //update publication 1
        if (await this.repository.save(res)) {
            if (await this.aliasRepository.delete({ elementId: In(authors.map(e => e.id)) }) && await this.repository.delete({ id: In(authors.map(e => e.id)) })) return res;
            else return { error: 'delete' };
        } else return { error: 'update' };
    }

    public async delete(insts: Publisher[]) {
        for (let inst of insts) {
            let conE: Publisher = await this.repository.findOne({ where: { id: inst.id }, relations: { publications: true, aliases: true } });
            let pubs = [];
            if (conE.publications) for (let pub of conE.publications) {
                pubs.push({ id: pub.id, publisher: null })
            }

            await this.publicationService.save(pubs);
            await this.aliasRepository.delete({ elementId: conE.id });
        }
        return await this.repository.delete(insts.map(p => p.id));
    }
}

