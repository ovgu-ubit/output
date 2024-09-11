import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { concatMap, defer, from, iif, Observable, of} from 'rxjs';
import { ILike, In, Repository } from 'typeorm';
import { Contract } from '../../entity/Contract';
import { ContractIndex } from '../../../../output-interfaces/PublicationIndex';
import { PublicationService } from './publication.service';

@Injectable()
export class ContractService {

    constructor(@InjectRepository(Contract) private repository: Repository<Contract>, private configService:ConfigService, private publicationService:PublicationService) { }

    public get() {
        return this.repository.find();
    }
    
    public async one(id:number, writer:boolean):Promise<Contract> {
        let contract = await this.repository.findOne({where:{id}, relations: {publisher:true, identifiers: true,publications: true}});
        
        if (writer && !contract.locked_at) {
            await this.save([{
                id: contract.id,
                locked_at: new Date()
            }]);
        } else if (writer && (new Date().getTime() - contract.locked_at.getTime()) > this.configService.get('lock_timeout') * 60 * 1000) {
            await this.save([{
                id: contract.id,
                locked_at: null
            }]);
            return this.one(id, writer);
        }        
        return contract;
    }

    public save(contracts:any[]) {
        return this.repository.save(contracts).catch(err => {
            if (err.constraint) throw new BadRequestException(err.detail)
            else throw new InternalServerErrorException(err);
        });
    }

    public findOrSave(title: string): Observable<Contract> {        
        if (!title) return of(null);
        let label = title;
        return from(this.repository.findOne({ where: { label: ILike(label) } })).pipe(concatMap(ge => {
            return iif(() => !!ge, of(ge), defer(() => from(this.repository.save({label: label}))));
        }));
    }

    public async index(reporting_year:number): Promise<ContractIndex[]> {
        if(!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        let query = this.repository.createQueryBuilder("contract")
            .leftJoin("contract.publications","publication","publication.\"contractId\" = contract.id and publication.pub_date between :beginDate and :endDate",{beginDate, endDate} )
            .leftJoin("contract.publisher","publisher")
            .select("contract.id","id")
            .addSelect("contract.label","label")
            .addSelect("contract.start_date","start_date")
            .addSelect("contract.end_date","end_date")
            .addSelect("contract.invoice_amount","invoice_amount")
            .addSelect("publisher.label","publisher")
            .addSelect("COUNT(publication.id)","pub_count")
           // .where("publication is NULL or (publication.pub_date between :beginDate and :endDate)", {beginDate, endDate})
            .groupBy("contract.id")
            .addGroupBy("contract.start_date")
            .addGroupBy("contract.end_date")
            .addGroupBy("contract.invoice_amount")
            .addGroupBy("publisher.label")

        //console.log(query.getSql());

        return query.getRawMany() as Promise<ContractIndex[]>;
    }

    public async combine(id1: number, ids: number[]) {
        let aut1: Contract = await this.repository.findOne({where:{id:id1},relations:{publisher:true}});
        let authors = []
        for (let id of ids) {
            authors.push(await this.repository.findOne({where:{id},relations:{publisher:true, publications:true}}))
        }
        
        if (!aut1 || authors.find(e => e === null || e === undefined)) return {error:'find'};
        
        let res = {...aut1};

        for (let aut of authors) {
            let pubs = [];
            for (let pub of aut.publications) {
                pubs.push({id:pub.id, contract: aut1})
            }
            await this.publicationService.save(pubs)
            if (!res.label && aut.label) res.label = aut.label;
            if (!res.start_date && aut.start_date) res.start_date = aut.start_date;
            if (!res.end_date && aut.end_date) res.end_date = aut.end_date;
            if (!res.internal_number && aut.internal_number) res.internal_number = aut.internal_number;
            if (!res.invoice_amount && aut.invoice_amount) res.invoice_amount = aut.invoice_amount;
            if (!res.invoice_information && aut.invoice_information) res.invoice_information = aut.invoice_information;
            if (!res.sec_pub && aut.sec_pub) res.sec_pub = aut.sec_pub;
            if (!res.gold_option && aut.gold_option) res.gold_option = aut.gold_option;
            if (!res.verification_method && aut.verification_method) res.verification_method = aut.verification_method;
            if (!res.publisher && aut.publisher) res.publisher = aut.publisher;
        }
        
        //update publication 1
        if (await this.repository.save(res)) {
            if (await this.repository.delete({id: In(authors.map(e => e.id))})) return res;
            else return {error:'delete'};
        } else return {error:'update'};
    }
    
    public async delete(insts:Contract[]) {
        for (let inst of insts) {
            let conE: Contract = await this.repository.findOne({where:{id:inst.id},relations:{publisher:true, publications:true},withDeleted: true});
            let pubs = [];
            if (conE.publications) for (let pub of conE.publications) {
                pubs.push({id:pub.id, contract: null})
            }
            
            await this.publicationService.save(pubs);
        }
        return await this.repository.delete(insts.map(p => p.id));
    }
}

