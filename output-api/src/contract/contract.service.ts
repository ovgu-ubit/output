import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { concatMap, defer, from, iif, Observable, of } from 'rxjs';
import { FindManyOptions, FindOptionsRelations, ILike, In, Repository } from 'typeorm';
import { Contract } from './Contract';
import { ContractIndex } from '../../../output-interfaces/PublicationIndex';
import { PublicationService } from '../publication/core/publication.service';
import { ContractIdentifier } from './ContractIdentifier';
import { AppConfigService } from '../config/app-config.service';
import { AbstractEntityService } from '../common/abstract-entity.service';
import { mergeEntities } from '../common/merge';

@Injectable()
export class ContractService extends AbstractEntityService<Contract> {

    constructor(
        @InjectRepository(Contract) repository: Repository<Contract>,
        configService: AppConfigService,
        private publicationService: PublicationService,
        @InjectRepository(ContractIdentifier) private idRepository: Repository<ContractIdentifier>,
    ) {
        super(repository, configService);
    }

    protected override getFindManyOptions(): FindManyOptions<Contract> {
        return { relations: { publisher: true } };
    }

    protected override getFindOneRelations(): FindOptionsRelations<Contract> {
        return { publisher: true, identifiers: true, publications: true };
    }

    public override async save(contract: Contract) {
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
        if (contract.identifiers && orig && orig.identifiers) orig.identifiers.forEach(async id => {
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
        return mergeEntities<Contract>({
            repository: this.repository,
            primaryId: id1,
            duplicateIds: ids,
            primaryRelations: { publisher: true, identifiers: true },
            duplicateRelations: { publisher: true, publications: true, identifiers: true },
            mergeDuplicate: async ({ primary, duplicate, accumulator }) => {
                const pubs = duplicate.publications?.map(pub => ({ id: pub.id, contract: primary })) ?? [];
                if (pubs.length > 0) {
                    await this.publicationService.save(pubs);
                }

                if (!accumulator.label && duplicate.label) accumulator.label = duplicate.label;
                if (!accumulator.start_date && duplicate.start_date) accumulator.start_date = duplicate.start_date;
                if (!accumulator.end_date && duplicate.end_date) accumulator.end_date = duplicate.end_date;
                if (!accumulator.internal_number && duplicate.internal_number) accumulator.internal_number = duplicate.internal_number;
                if (!accumulator.invoice_amount && duplicate.invoice_amount) accumulator.invoice_amount = duplicate.invoice_amount;
                if (!accumulator.invoice_information && duplicate.invoice_information) accumulator.invoice_information = duplicate.invoice_information;
                if (!accumulator.sec_pub && duplicate.sec_pub) accumulator.sec_pub = duplicate.sec_pub;
                if (!accumulator.gold_option && duplicate.gold_option) accumulator.gold_option = duplicate.gold_option;
                if (!accumulator.verification_method && duplicate.verification_method) accumulator.verification_method = duplicate.verification_method;
                if (!accumulator.publisher && duplicate.publisher) accumulator.publisher = duplicate.publisher;

                if (!accumulator.identifiers) accumulator.identifiers = [];
                accumulator.identifiers = accumulator.identifiers.concat(duplicate.identifiers ?? []);
            },
        });
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

