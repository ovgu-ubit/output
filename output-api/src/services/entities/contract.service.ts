import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { concatMap, defer, from, iif, Observable, of } from 'rxjs';
import { ILike, In, Repository } from 'typeorm';
import { Contract } from '../../entity/Contract';
import { ContractIndex } from '../../../../output-interfaces/PublicationIndex';
import { PublicationService } from './publication.service';
import { ContractIdentifier } from '../../entity/identifier/ContractIdentifier';

@Injectable()
export class ContractService {

    constructor(@InjectRepository(Contract) private repository: Repository<Contract>, private configService: ConfigService, private publicationService: PublicationService,
        @InjectRepository(ContractIdentifier) private idRepository: Repository<ContractIdentifier>) { }

    public get() {
        return this.repository.find({ relations: { publisher: true } });
    }

    public async one(id: number, writer: boolean): Promise<Contract> {
        let contract = await this.repository.findOne({ where: { id }, relations: { publisher: true, identifiers: true, publications: true } });

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

    public save(contracts: any[]) {
        return this.repository.save(contracts).catch(err => {
            if (err.constraint) throw new BadRequestException(err.detail)
            else throw new InternalServerErrorException(err);
        });
    }

    public async update(contract: any) {
        let orig: Contract = await this.repository.findOne({ where: { id: contract.id }, relations: { identifiers: true } })
        if (contract.identifiers) {
            for (let id of contract.identifiers) {
                if (!id.id) {
                    id.value = id.value.toUpperCase();
                    id.type = id.type.toLowerCase();
                    id.id = (await this.idRepository.save(id).catch(err => {
                        if (err.constraint) throw new BadRequestException(err.detail)
                        else throw new InternalServerErrorException(err);
                    })).id;
                }
            }
        }
        if (orig && orig.identifiers) orig.identifiers.forEach(async id => {
            if (!contract.identifiers.find(e => e.id === id.id)) await this.idRepository.delete(id.id)
        })

        return await this.repository.save(contract).catch(err => {
            if (err.constraint) throw new BadRequestException(err.detail)
            else throw new InternalServerErrorException(err);
        });
    }

    public findOrSave(title: string): Observable<Contract> {
        if (!title) return of(null);
        let label = title;
        return from(this.repository.findOne({ where: { label: ILike(label) } })).pipe(concatMap(ge => {
            return iif(() => !!ge, of(ge), defer(() => from(this.repository.save({ label: label }))));
        }));
    }

    public async index(reporting_year: number): Promise<ContractIndex[]> {
        let query = this.repository.createQueryBuilder("contract")
            .leftJoin("contract.publisher", "publisher")
            .select("contract.id", "id")
            .addSelect("contract.label", "label")
            .addSelect("contract.start_date", "start_date")
            .addSelect("contract.end_date", "end_date")
            .addSelect("contract.invoice_amount", "invoice_amount")
            .addSelect("publisher.label", "publisher")
            .addSelect("COUNT(publication.id)", "pub_count")
            .groupBy("contract.id")
            .addGroupBy("contract.start_date")
            .addGroupBy("contract.end_date")
            .addGroupBy("contract.invoice_amount")
            .addGroupBy("publisher.label")

        if (reporting_year) {
            let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
            let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
            query = query
                .leftJoin("contract.publications", "publication", "publication.\"contractId\" = contract.id and publication.pub_date between :beginDate and :endDate", { beginDate, endDate })
        }
        else {
            query = query
                .leftJoin("contract.publications", "publication", "publication.\"contractId\" = contract.id and publication.pub_date IS NULL and publication.pub_date_print IS NULL and publication.pub_date_accepted IS NULL and publication.pub_date_submitted IS NULL")
        }
        //console.log(query.getSql());

        return query.getRawMany() as Promise<ContractIndex[]>;
    }

    public async combine(id1: number, ids: number[]) {
        let aut1: Contract = await this.repository.findOne({ where: { id: id1 }, relations: { publisher: true } });
        let authors = []
        for (let id of ids) {
            authors.push(await this.repository.findOne({ where: { id }, relations: { publisher: true, publications: true } }))
        }

        if (!aut1 || authors.find(e => e === null || e === undefined)) return { error: 'find' };

        let res = { ...aut1 };

        for (let aut of authors) {
            let pubs = [];
            for (let pub of aut.publications) {
                pubs.push({ id: pub.id, contract: aut1 })
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
            if (!res.identifiers) res.identifiers = [];
            res.identifiers = res.identifiers.concat(aut.identifiers/*.map(e => {return {...e,entity:aut1}})*/)
        }

        //update publication 1
        if (await this.repository.save(res)) {
            if (await this.repository.delete({ id: In(authors.map(e => e.id)) })) return res;
            else return { error: 'delete' };
        } else return { error: 'update' };
    }

    public async delete(insts: Contract[]) {
        for (let inst of insts) {
            let conE: Contract = await this.repository.findOne({ where: { id: inst.id }, relations: { publisher: true, publications: true }, withDeleted: true });
            let pubs = [];
            if (conE.publications) for (let pub of conE.publications) {
                pubs.push({ id: pub.id, contract: null })
            }

            await this.publicationService.save(pubs);
        }
        return await this.repository.delete(insts.map(p => p.id));
    }
}

