import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { ILike, In, Repository } from 'typeorm';
import { AuthorIndex } from '../../../../output-interfaces/PublicationIndex';
import { Author } from '../../entity/Author';
import { AuthorPublication } from '../../entity/AuthorPublication';
import { Publication } from '../../entity/Publication';
import { AppConfigService } from '../app-config.service';
import { InstitutionService } from './institution.service';
import { AppError } from '../../../../output-interfaces/Config';
import { ConfigService } from '@nestjs/config';
import { AliasAuthorFirstName } from '../../entity/alias/AliasAuthorFirstName';
import { AliasAuthorLastName } from '../../entity/alias/AliasAuthorLastName';

@Injectable()
export class AuthorService {

    constructor(@InjectRepository(Author) private repository: Repository<Author>, private appConfigService: AppConfigService,
        private instService: InstitutionService, @InjectRepository(AuthorPublication) private pubAutRepository: Repository<AuthorPublication>,
        @InjectRepository(AliasAuthorFirstName) private aliasFirstNameRepository: Repository<AliasAuthorFirstName>,
        @InjectRepository(AliasAuthorLastName) private aliasLastNameRepository: Repository<AliasAuthorLastName>,
        private configService: ConfigService) { }

    public save(aut: any[]) {
        return this.repository.save(aut).catch(err => {
            if (err.constraint) throw new BadRequestException(err.detail)
            else throw new InternalServerErrorException(err);
        });
    }

    public get(id?:number) {
        return this.repository.find({ relations: {institutes: true}});
    }

    public async one(id: number, writer: boolean) {
        let aut = await this.repository.findOne({ where: { id }, relations: { institutes: true, aliases_first_name: true, aliases_last_name: true } });
        if (writer && !aut.locked_at) {
            await this.save([{
                id: aut.id,
                locked_at: new Date()
            }]);
        } else if (writer && (new Date().getTime() - aut.locked_at.getTime()) > this.configService.get('lock_timeout') * 60 * 1000) {
            await this.save([{
                id: aut.id,
                locked_at: null
            }]);
            return this.one(id, writer);
        }
        return aut;
    }

    public async identifyAuthor(last_name: string, first_name: string): Promise<Author> {
        let aliasL = await this.aliasLastNameRepository.createQueryBuilder('alias')
            .leftJoinAndSelect('alias.element', 'element')
            .where(':label ILIKE CONCAT(\'%\',alias.alias,\'%\')', { label: last_name })
            .getMany();

        let aliasF = await this.aliasFirstNameRepository.createQueryBuilder('alias')
            .leftJoinAndSelect('alias.element', 'element')
            .where(':label ILIKE CONCAT(\'%\',alias.alias,\'%\')', { label: first_name })
            .getMany();

        if (aliasL && aliasL.length > 0 && aliasF && aliasF.length > 0) {
            //both alias in the same entity
            let id = aliasL.find(e => aliasF.find(f => f.elementId === e.elementId)).elementId;
            if (id) return this.repository.findOne({ where: { id }, relations: { institutes: true } })
        }
        if (aliasL.length > 0) {
            for (let alias of aliasL) {
                let aut = await this.repository.findOne({where: {id: alias.elementId}, relations: { institutes: true }})
                if (aut.first_name.toLowerCase().includes(first_name.toLowerCase())) return aut;
            }
        }
        if (aliasF.length > 0) {
            for (let alias of aliasF) {
                let aut = await this.repository.findOne({where: {id: alias.elementId}, relations: { institutes: true }})
                if (aut.last_name.toLowerCase().includes(last_name.toLowerCase())) return aut;
            }
        }
        return null;
    }

    public async findOrSave(last_name: string, first_name: string, orcid?: string, affiliation?: string): Promise<{author:Author,error:AppError}> {
        if (!orcid && (!last_name || !first_name)) throw { origin: 'authorService', text: `weder ORCID, noch Vor- und Nachname sind gegeben` } as AppError;
        let error:AppError = null;
        //1. find an existing entity
        let author: Author;
        //replace points from initials
        first_name = first_name.replace('\.', '').trim();
        last_name = last_name.trim();
        //find via orcid
        if (orcid) author = await this.repository.findOne({ where: { orcid }, relations: { institutes: true } });
        if (!author) {
            //find via name
            let authors = await this.repository.find({ where: { last_name: ILike(last_name), first_name: ILike(first_name + '%') }, relations: { institutes: true } });
            if (authors.length > 1) {
                //assign first author and give warning
                author = authors[0];
                error = { origin: 'authorService', text: `mehrdeutiger Autor ${last_name}, ${first_name} wurde ${authors.length} mal gefunden in DB mit IDs: ${authors.reduce<string>((v,c,i,a) => {return v+', '+c.id},'')}` } as AppError;
            } else if (authors.length > 0) author = authors[0];
            else {
                //find via alias
                author = await this.identifyAuthor(last_name, first_name);
            }
        }
        //2. if found, possibly enrich
        //find an affiliation institute
        let inst = affiliation ? await firstValueFrom(this.instService.findOrSave(affiliation)) : null;
        if (author) {
            let flag = false;
            if (orcid && !author.orcid) {
                author.orcid = orcid;
                flag = true;
            }
            if (inst && (!author.institutes || author.institutes.length === 0) && !author.institutes.find(e => e.id === inst.id)) {
                if (!author.institutes) author.institutes = [];
                author.institutes.push(inst)
                flag = true;
            }

            if (flag) return {author: await this.repository.save(author), error};
            else return {author, error};
        } else return {author: await this.repository.save({ last_name, first_name, orcid, institutes: [inst] }), error};
        //3. if not found, save
    }
    
    public async combineAuthors(id1: number, ids: number[], aliases_first_name?: string[], aliases_last_name?: string[]) {
        let aut1: Author = await this.repository.findOne({ where: { id: id1 }, relations: { authorPublications: true, institutes: true, aliases_first_name: true, aliases_last_name: true } })
        let authors = []
        for (let id of ids) {
            authors.push(await this.repository.findOne({ where: { id }, relations: { authorPublications: true, institutes: true, aliases_first_name: true, aliases_last_name: true } }))
        }

        if (!aut1 || authors.find(e => e === null || e === undefined)) return { error: 'find' };

        let institutes = aut1.institutes;
        let res = { ...aut1 };

        for (let aut of authors) {
            for (let ap of aut.authorPublications) await this.pubAutRepository.save({ publicationId: ap.publicationId, authorId: aut1.id, corresponding: ap.corresponding, institute: ap.institute })
            for (let inst of aut.institutes) {
                if (!institutes.find(e => e.id === inst.id)) institutes.push(inst);
            }
            if (!res.orcid && aut.orcid) res.orcid = aut.orcid;
            if (!res.title && aut.title) res.title = aut.title;
            if (!res.first_name && aut.first_name) res.first_name = aut.first_name;
            if (!res.last_name && aut.last_name) res.last_name = aut.last_name;
            if (aut.aliases_first_name) for (let alias of aut.aliases_first_name) {
                res.aliases_first_name.push({elementId: res.id, alias: alias.alias})
            }
            if (aut.aliases_last_name) for (let alias of aut.aliases_last_name) {
                res.aliases_last_name.push({elementId: res.id, alias: alias.alias})
            }
        }
        res.institutes = institutes;
        res.authorPublications = undefined;
        
        //update aliases
        if (aliases_first_name) {
            for (let alias of aliases_first_name) {
                res.aliases_first_name.push({elementId: res.id, alias});
            }
        }
        if (aliases_last_name) {
            for (let alias of aliases_last_name) {
                res.aliases_last_name.push({elementId: res.id, alias});
            }
        }

        //update publication 1
        if (await this.repository.save(res)) {
            if (await this.aliasFirstNameRepository.delete({elementId: In(authors.map(e => e.id))}) && await this.aliasLastNameRepository.delete({elementId: In(authors.map(e => e.id))}) && await this.pubAutRepository.delete({ authorId: In(authors.map(e => e.id)) })) {
                if (await this.repository.delete({ id: In(authors.map(e => e.id)) })) return res;
            }
            else return { error: 'delete' };
        } else return { error: 'update' };
    }

    public async index(reporting_year: number): Promise<AuthorIndex[]> {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.appConfigService.get('reporting_year'));
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        let query = this.repository.manager.createQueryBuilder()
            .from((sq) => sq
                .from("author", "author")
                .leftJoin("author.institutes", "institute")
                .select("author.id", "id")
                .addSelect("author.orcid", "orcid")
                .addSelect("author.gnd_id", "gnd_id")
                .addSelect("author.title", "title")
                .addSelect("author.first_name", "first_name")
                .addSelect("author.last_name", "last_name")
                .addSelect("STRING_AGG(\"institute\".\"label\", '; ')", "institutes")
                .groupBy("author.id")
                .addGroupBy("author.orcid")
                .addGroupBy("author.first_name")
                .addGroupBy("author.last_name")
                .addGroupBy("author.orcid")
                , "a")
            .leftJoin((sq) => sq
                .from(AuthorPublication, "authorPublication")
                .innerJoin("publication", "publication", "publication.id = authorPublication.publicationId")
                , "b", "b.\"authorId\" = a.id")
            .select("a.id", "id")
            .addSelect("a.orcid", "orcid")
            .addSelect("a.gnd_id", "gnd_id")
            .addSelect("a.title", "title")
            .addSelect("a.first_name", "first_name")
            .addSelect("a.last_name", "last_name")
            .addSelect("COUNT(b)", "pub_count_total")
            .addSelect("a.institutes", "institutes")
            .addSelect("SUM(CASE WHEN b.pub_date >= '"+beginDate.toISOString()+"' and b.pub_date <= '"+endDate.toISOString()+"' and b.\"corresponding\" THEN 1 ELSE 0 END)", "pub_count_corr")
            .addSelect("SUM(CASE WHEN b.pub_date >= '"+beginDate.toISOString()+"' and b.pub_date <= '"+endDate.toISOString()+"' THEN 1 ELSE 0 END)", "pub_count")
            .groupBy("a.id")
            .addGroupBy("a.orcid")
            .addGroupBy("a.title")
            .addGroupBy("a.first_name")
            .addGroupBy("a.last_name")
            .addGroupBy("a.orcid")
            .addGroupBy("a.gnd_id")
            .addGroupBy("a.institutes")

        //console.log(query.getSql());

        return query.getRawMany() as Promise<AuthorIndex[]>;
    }

    public async delete(auts: Author[]) {
        for (let aut of auts) {
            let autE = await this.repository.findOne({ where: { id: aut.id }, relations: { authorPublications: true, institutes: true } })
            if (autE.authorPublications) for (let autPub of autE.authorPublications) {
                await this.pubAutRepository.delete({ authorId: autPub.authorId, publicationId: autPub.publicationId });
            }
        }
        return await this.repository.delete(auts.map(p => p.id));
    }
}

