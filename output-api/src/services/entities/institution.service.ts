import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { concatMap, defer, from, iif, Observable, of, firstValueFrom } from 'rxjs';
import { Between, EntityManager, ILike, In, Repository, TreeRepository } from 'typeorm';
import { Institute } from '../../entity/Institute';
import { InstituteIndex } from '../../../../output-interfaces/PublicationIndex';
import { AuthorPublication } from '../../entity/AuthorPublication';
import { Author } from '../../entity/Author';
import { AliasInstitute } from '../../entity/alias/AliasInstitute';
import { Publication } from '../../entity/Publication';

@Injectable()
export class InstitutionService {

    repository: TreeRepository<Institute> = this.manager.getTreeRepository(Institute);

    constructor(@InjectEntityManager() private manager: EntityManager, private configService: ConfigService,
        @InjectRepository(AuthorPublication) private pubAutRepository: Repository<AuthorPublication>,
        @InjectRepository(Author) private autRepository: Repository<Author>,
        @InjectRepository(Publication) private pubRepository: Repository<Publication>,
        @InjectRepository(AliasInstitute) private aliasRepository: Repository<AliasInstitute>) { }

    public save(inst: any[]) {
        return this.repository.save(inst);
    }

    public get() {
        return this.repository.find({relations:{aliases:true}});
    }
    public async one(id: number, writer: boolean) {
        let inst = await this.repository.findOne({ where: { id }, relations: { super_institute: true, sub_institutes: true, aliases: true } });
        
        if (writer && !inst.locked_at) {
            await this.save([{
                id: inst.id,
                locked_at: new Date()
            }]);
        } else if (writer && (new Date().getTime() - inst.locked_at.getTime()) > this.configService.get('lock_timeout') * 60 * 1000) {
            await this.save([{
                id: inst.id,
                locked_at: null
            }]);
            return this.one(id, writer);
        }
        
        return inst;
    }

    public async delete(insts: Institute[]) {
        for (let inst of insts) {
            let instE = await this.repository.findOne({ where: { id: inst.id }, relations: { authorPublications: { institute: true }, authors: { institutes: true } } });
            if (instE.authorPublications) for (let autPub of instE.authorPublications) {
                await this.pubAutRepository.save({ authorId: autPub.authorId, publicationId: autPub.publicationId, institute: null });
            }
            if (instE.authors) for (let aut of instE.authors) {
                aut.institutes = aut.institutes.filter(e => e.id !== inst.id);
                this.autRepository.save([aut])
            }
            await this.aliasRepository.delete({elementId: instE.id});
        }
        return await this.repository.delete(insts.map(p => p.id));
    }

    public findOrSave(affiliation: string): Observable<Institute> {
        if (!affiliation) return of(null);
        return from(this.identifyInstitution(affiliation)).pipe(concatMap(data => {
            return from(this.repository.findOne({ where: { label: ILike(data) } }));
        }));
    }

    public async identifyInstitution(affiliation: string) {
        let alias = await this.aliasRepository.createQueryBuilder('alias')
            .leftJoinAndSelect('alias.element', 'element')
            .where(':label ILIKE CONCAT(\'%\',alias.alias,\'%\')', { label: affiliation })
            .getOne();

        if (alias) return alias.element.label;
        return affiliation;
    }

    public async index(reporting_year: number): Promise<InstituteIndex[]> {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        let time;
        let result;
/*
        let pubs = (await this.pubRepository.find({ where: { pub_date: Between(beginDate, endDate) }, select: { id: true } })).map(e => e.id)

        time = new Date();
        let tree = await this.repository.findTrees({ relations: ['authorPublications', 'authors'] });
        result: InstituteIndex[] = [];

        for (let root of tree) {
            result = result.concat(this.evalSubTree(root, pubs).index)
        }
        console.log('FindTrees: ' + (new Date().getTime() - time.getTime()) / 1000)
*/
        /////////////////////////////////

  /*     time = new Date();
        let roots = await this.repository.findRoots({ relations: ['authors'] });
        result = [];
        for (let root of roots) {
            let query = this.repository.createDescendantsQueryBuilder("institute", "institute_closure", root)
                .leftJoin("author_publication","aut_pub", "aut_pub.\"instituteId\" = institute.id")
                .leftJoin("publication","pub", "aut_pub.\"publicationId\" = pub.id")
                .leftJoin("author_institutes_institute","aut_inst", "aut_inst.\"instituteId\" = institute.id")
                .select("institute.id", "id")
                .addSelect("institute.label", "label")
                .addSelect("institute.short_label", "short_label")
                .addSelect("COUNT(distinct pub.id)", "pub_count")
                .addSelect("COUNT(distinct (CASE WHEN \"aut_pub\".\"corresponding\" THEN pub.id ELSE NULL END))", "pub_corr_count")
                .addSelect("COUNT(distinct aut_inst.\"authorId\")", "author_count")
                .where('pub is NULL')
                .orWhere('pub_date between :beginDate and :endDate', { beginDate, endDate })
                .groupBy("institute.id")
                .addGroupBy("institute.label")
                .addGroupBy("institute.short_label")

            console.log(query.getSql());
            result = result.concat(await query.getRawMany());
        }
        console.log('FindRoots: ' + (new Date().getTime() - time.getTime()) / 1000)
*/
        //////////////////////////////////

        time = new Date();
        let instIDs = (await this.repository.find({relations: {authors: true}}))
        result = [];
        for (let inst of instIDs) {
            let query = this.repository.createQueryBuilder("institute")
                .innerJoin("institute_closure", "ic", "ic.id_descendant = institute.id", )
                .leftJoin("author_publication", "aut_pub", "aut_pub.\"instituteId\" = institute.id")
                .leftJoin("publication", "pub", "aut_pub.\"publicationId\" = pub.id")
                .leftJoin("author_institutes_institute", "aut_inst", "aut_inst.\"instituteId\" = institute.id")
                .select("COUNT(distinct pub.id)", "pub_count")
                .addSelect("COUNT(distinct (CASE WHEN \"aut_pub\".\"corresponding\" THEN pub.id ELSE NULL END))", "pub_corr_count")
                .addSelect("COUNT(distinct aut_inst.\"authorId\")", "author_count_total")
                .addSelect("COUNT(distinct id_descendant)-1","sub_inst_count")
                .where("ic.id_ancestor = :id",{id:inst.id})
                .andWhere('(pub is NULL or pub_date between :beginDate and :endDate)', { beginDate, endDate })
            
            //console.log(query.getSql());
            let res = await query.getRawOne() as any;
            result.push({ ...res, sub_inst_count:res.sub_inst_count < 0? 0: res.sub_inst_count, id: inst.id, label: inst.label, short_label: inst.short_label, author_count: inst.authors?.length });
        }
        //console.log('SQL: ' + (new Date().getTime() - time.getTime()) / 1000)


        return result;
    }

    evalSubTree(node: Institute, pubs: number[]): { index: InstituteIndex[], pubs: AuthorPublication[], authors: Author[] } {
        if (!node.sub_institutes || node.sub_institutes.length === 0) {
            return {
                index: [{
                    id: node.id,
                    label: node.label,
                    short_label: node.short_label,
                    pub_count: node.authorPublications.filter((e, i, a) => a.findIndex(el => el.publicationId === e.publicationId) === i && pubs.includes(e.publicationId)).length,
                    pub_corr_count: node.authorPublications.filter(e => e.corresponding).filter((e, i, a) => a.findIndex(el => el.publicationId === e.publicationId) === i && pubs.includes(e.publicationId)).length,
                    author_count: node.authors.length,
                    author_count_total: node.authors.length,
                    sub_inst_count: 0
                }], pubs: node.authorPublications, authors: node.authors
            }
        } else {
            let result = { index: [], pubs: [], authors: [] }
            for (let sub of node.sub_institutes) {
                result.index = result.index.concat(this.evalSubTree(sub, pubs).index)
                result.pubs = result.pubs.concat(this.evalSubTree(sub, pubs).pubs)
                result.authors = result.authors.concat(this.evalSubTree(sub, pubs).authors)
            }
            result.pubs = result.pubs.concat(node.authorPublications).filter((e, i, a) => a.findIndex(el => el.publicationId === e.publicationId) === i)
            result.authors = result.authors.concat(node.authors).filter((e, i, a) => a.findIndex(el => el.id === e.id) === i)
            result.index.push({
                id: node.id,
                label: node.label,
                short_label: node.short_label,
                pub_count: result.pubs.filter(e => pubs.includes(e.publicationId)).length,
                pub_corr_count: result.pubs.filter(e => e.corresponding && pubs.includes(e.publicationId)).length,
                author_count: node.authors.length,
                author_count_total: result.authors.length,
                sub_inst_count: node.sub_institutes.length + result.index.reduce((pv, cv) => cv.sub_inst_count + pv, 0),
            });
            return result;
        }
    }

    public async combine(id1: number, ids: number[], alias_strings?: string[]) {
        let aut1 = await this.repository.findOne({ where: { id: id1 }, relations: { authorPublications: { institute: true }, authors: { institutes: true }, super_institute: true, aliases: true } });
        let authors = []
        for (let id of ids) {
            authors.push( await this.repository.findOne({ where: { id}, relations: { authorPublications: { institute: true }, authors: { institutes: true }, super_institute: true, aliases: true } }))
        }
        
        if (!aut1 || authors.find(e => e === null || e === undefined)) return {error:'find'};
        
        let res = {...aut1};
        res.authorPublications = undefined;

        for (let aut of authors) {
            for (let ap of aut.authorPublications) await this.pubAutRepository.save({ publicationId: ap.publicationId, authorId: ap.authorId, corresponding: ap.corresponding, institute: res })

            for (let auth of aut.authors) {
                let newInst = auth.institutes?.filter(e => e.id !== aut.id);
                if (!newInst.find(e => e.id === aut.id)) newInst.push(res);
                await this.autRepository.save({ id: auth.id, institutes: newInst })
            }

            for (let alias of aut.aliases) {
                res.aliases.push({elementId: res.id, alias: alias.alias})
            }

            if (!res.label && aut.label) res.label = aut.label;
            if (!res.short_label && aut.short_label) res.short_label = aut.short_label;
            if (!res.aliases) res.aliases = [];
            res.aliases.concat(aut.aliases.map(e => { return { alias: e.alias, elementId: aut1.id } as AliasInstitute }))
            if (!res.authors) res.authors = [];
            res.authors.concat(aut.authors.map(e => { return { alias: e.alias, elementId: aut1.id } as AliasInstitute }))
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

    async findSuperInstitute(id: number) {
        let insts = await this.repository.find({ relations: { super_institute: true } })
        let inst = await this.repository.findOne({ where: { id }, relations: { super_institute: true } })
        let result = insts.find(e => e.id === inst.super_institute?.id);
        let tmp = result;
        while (tmp) {
            result = tmp;
            tmp = insts.find(e => e.id === tmp.super_institute?.id)
        }
        return result;
    }

    async findSubInstitutesFlat(id: number) {
        let insts = await this.repository.find({ relations: { sub_institutes: true } })
        let inst = await this.repository.findOne({ where: { id }, relations: { sub_institutes: true } })
        let result = inst.sub_institutes;
        let flag = inst.sub_institutes && inst.sub_institutes.length > 0;
        while (flag) {
            flag = false;
            let newSubs = [];
            for (let sub of result) {
                let subI = insts.find(e => e.id === sub.id)
                if (subI.sub_institutes && subI.sub_institutes.length > 0) {
                    newSubs = newSubs.concat(subI.sub_institutes);
                    subI.sub_institutes = [];
                    flag = true;
                }
            }
            result = result.concat(newSubs);
        }
        return result;
    }
}

