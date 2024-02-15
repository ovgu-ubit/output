import { Injectable } from '@nestjs/common';
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

@Injectable()
export class AuthorService {

    constructor(@InjectRepository(Author) private repository: Repository<Author>, private appConfigService: AppConfigService,
        private instService: InstitutionService, @InjectRepository(AuthorPublication) private pubAutRepository: Repository<AuthorPublication>,
        private configService:ConfigService) { }

    public save(aut: any[]) {
        return this.repository.save(aut);
    }

    public get() {
        return this.repository.find();
    }

    public async one(id:number, writer:boolean) {
        let aut = await this.repository.findOne({where: {id}, relations: { authorPublications: true, institutes: true }});
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

    public async findOrSave(last_name: string, first_name: string, orcid?: string, affiliation?: string): Promise<Author> {
        if (!last_name || !first_name) return null;
        //1. find an existing entity
        let author: Author;
        //replace points from initials
        first_name = first_name.replace('\.', '').trim();
        last_name = last_name.trim();
        //find via orcid
        if (orcid) author = await this.repository.findOne({ where: { orcid }, relations: {institutes:true} });
        if (!author) {
            //find via first name
            let authors = await this.repository.find({ where: { last_name: ILike(last_name), first_name: ILike(first_name + '%') }, relations: { institutes: true } });
            if (authors.length > 1) {
                throw { origin: 'authorService', text: `ambigious author ${last_name}, ${first_name} had ${authors.length} matches in DB` } as AppError;
            } else if (authors.length > 0) author = authors[0];
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

            if (flag) return await this.repository.save(author);
            else return author;
        } else return await this.repository.save({ last_name, first_name, orcid, institutes: [inst] });
        //3. if not found, save
    }

    public async combineAuthors(id1: number, ids: number[]) {
        let aut1: Author = await this.one(id1, false)
        let authors = []
        for (let id of ids) {
            authors.push(await this.one(id, false))
        }
        
        if (!aut1 || authors.find(e => e === null || e === undefined)) return {error:'find'};

        let institutes = aut1.institutes;
        let res = {...aut1};

        for (let aut of authors) {
            for (let ap of aut.authorPublications) await this.pubAutRepository.save({publicationId: ap.publicationId, authorId: aut1.id, corresponding: ap.corresponding, institute: ap.institute})
            for (let inst of aut.institutes) {
                if (!institutes.find(e => e.id === inst.id)) institutes.push(inst);
            }
            if (!res.orcid && aut.orcid) res.orcid = aut.orcid;
            if (!res.title && aut.title) res.title = aut.title;
            if (!res.first_name && aut.first_name) res.first_name = aut.first_name;
            if (!res.last_name && aut.last_name) res.last_name = aut.last_name;
        }
        res.institutes = institutes;
        res.authorPublications = undefined;

        //update publication 1
        if (await this.repository.save(res)) {
            if (await this.pubAutRepository.delete({authorId: In(authors.map(e => e.id))})) {
                if(await this.repository.delete({id: In(authors.map(e => e.id))})) return res;
            }
            else return {error:'delete'};
        } else return {error:'update'};
    }

    public async index(reporting_year:number): Promise<AuthorIndex[]> {
        if(!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.appConfigService.get('reporting_year'));
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        let query = this.repository.manager.createQueryBuilder()
            .from((sq) => sq
                .from("author", "author")
                .leftJoin("author.institutes", "institute")
                .select("author.id", "id")
                .addSelect("author.orcid", "orcid")
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
                .innerJoin("publication","publication", "publication.id = authorPublication.publicationId and publication.pub_date >= :beginDate and publication.pub_date <= :endDate", {beginDate, endDate})
                , "b", "b.\"authorId\" = a.id")
            .select("a.id", "id")
            .addSelect("a.orcid", "orcid")
            .addSelect("a.title", "title")
            .addSelect("a.first_name", "first_name")
            .addSelect("a.last_name", "last_name")
            .addSelect("COUNT(b)", "pub_count")
            .addSelect("a.institutes", "institutes")
            .addSelect("SUM(CASE WHEN b.\"corresponding\" THEN 1 ELSE 0 END)", "pub_corr_count")
            .groupBy("a.id")
            .addGroupBy("a.orcid")
            .addGroupBy("a.title")
            .addGroupBy("a.first_name")
            .addGroupBy("a.last_name")
            .addGroupBy("a.orcid")
            .addGroupBy("a.institutes")

        //console.log(query.getSql());

        return query.getRawMany() as Promise<AuthorIndex[]>;
    }

    public async delete(auts: Author[]) {
        for (let aut of auts) {
            let autE = await this.one(aut.id, false);
            if (autE.authorPublications) for (let autPub of autE.authorPublications) {
                await this.pubAutRepository.delete({ authorId: autPub.authorId, publicationId: autPub.publicationId });
            }
        }
        return await this.repository.delete(auts.map(p => p.id));
    }
}

