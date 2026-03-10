import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { concatMap, defer, from, iif, Observable, of } from 'rxjs';
import { DeepPartial, FindManyOptions, FindOptionsRelations, FindOptionsWhere, ILike, In, Repository } from 'typeorm';
import { ZodError } from 'zod';
import { Contract } from './Contract.entity';
import { ContractIndex } from '../../../output-interfaces/PublicationIndex';
import { PublicationService } from '../publication/core/publication.service';
import { ContractIdentifier } from './ContractIdentifier.entity';
import { AppConfigService } from '../config/app-config.service';
import { AbstractEntityService } from '../common/abstract-entity.service';
import { createPersistenceHttpException } from '../common/api-error';
import { hasProvidedEntityId } from '../common/entity-id';
import { mergeEntities } from '../common/merge';
import { ContractComponent } from './ContractComponent.entity';
import { parseContractModelParams } from './contract-model-params.schema';
import { Invoice } from '../invoice/Invoice.entity';

@Injectable()
export class ContractService extends AbstractEntityService<Contract> {

    constructor(
        @InjectRepository(Contract) repository: Repository<Contract>,
        configService: AppConfigService,
        private publicationService: PublicationService,
        @InjectRepository(ContractIdentifier) private idRepository: Repository<ContractIdentifier>,
        @InjectRepository(ContractComponent) private contractComponentRepository: Repository<ContractComponent>,
        @InjectRepository(Invoice) private invoiceRepository: Repository<Invoice>,
    ) {
        super(repository, configService);
    }

    protected override getFindManyOptions(): FindManyOptions<Contract> {
        return { relations: { publisher: true } };
    }

    protected override getFindOneRelations(): FindOptionsRelations<Contract> {
        return {
            publisher: true,
            identifiers: true,
            publications: true,
            components: {
                invoices: true,
                pre_invoices: true,
                oa_categories: true,
                pub_types: true,
                greater_entities: true,
                cost_types: true,
            },
        };
    }

    public override async save(contract: Contract) {
        const orig: Contract | null = hasProvidedEntityId(contract.id)
            ? await this.repository.findOne({ where: { id: contract.id }, relations: { identifiers: true } })
            : null;

        if (!orig) throw new BadRequestException(`Contract with id ${contract.id} does not exist`);
        const normalizedContract = this.normalizeContractComponents(contract);

        if (normalizedContract.identifiers) {
            for (const id of normalizedContract.identifiers) {
                if (!hasProvidedEntityId(id.id)) {
                    id.value = id.value.toUpperCase();
                    id.type = id.type.toLowerCase();
                    id.id = (await this.idRepository.save(id).catch((error: unknown) => {
                        throw createPersistenceHttpException(error);
                    })).id;
                }
            }
        }
        
        if (normalizedContract.identifiers && orig && orig.identifiers) {
            orig.identifiers.forEach(async id => {
                if (!normalizedContract.identifiers.find(e => e.id === id.id)) await this.idRepository.delete(id.id);
            });
        }

        return await this.repository.save(contract).catch((error: unknown) => {
            throw createPersistenceHttpException(error);
        });
    }

    public async saveComponent(component: DeepPartial<ContractComponent>) {
        const normalizedComponent = this.normalizeContractComponentForCreate(this.validateAndNormalizeContractComponent(component));

        if (!normalizedComponent.contract?.id) {
            throw new BadRequestException('contract.id is required to create a contract component');
        }

        return await this.contractComponentRepository.save(normalizedComponent).catch(err => {
            throw createPersistenceHttpException(err)
        });
    }

    public async updateComponent(component: DeepPartial<ContractComponent>) {
        if (!component?.id) {
            throw new BadRequestException('id is required to update a contract component');
        }

        const normalizedComponent = this.validateAndNormalizeContractComponent(component);

        return await this.contractComponentRepository.save(normalizedComponent).catch(err => {
            throw createPersistenceHttpException(err)
        });
    }

    public async getComponents(contractId?: number) {
        const options: FindManyOptions<ContractComponent> = {
            relations: this.getContractComponentRelations(),
        };

        if (contractId) {
            options.where = { contract: { id: contractId } } as FindOptionsWhere<ContractComponent>;
        }

        return this.contractComponentRepository.find(options);
    }

    public async oneComponent(id: number) {
        return this.contractComponentRepository.findOne({
            where: { id },
            relations: this.getContractComponentRelations(),
        });
    }

    public async deleteComponents(components: Pick<ContractComponent, 'id'>[]) {
        const componentIds = components.map(component => component.id).filter((id): id is number => !!id);
        if (!componentIds.length) {
            return this.contractComponentRepository.delete([]);
        }

        const linkedInvoices = await this.invoiceRepository.find({
            where: { contract_component: { id: In(componentIds) } },
        });

        if (linkedInvoices.length) {
            await this.invoiceRepository.save(linkedInvoices.map(invoice => ({
                id: invoice.id,
                contract_component: null,
            })));
        }

        return this.contractComponentRepository.delete(componentIds);
    }

    public normalizeContractComponentForCreate(component: DeepPartial<ContractComponent>) {
        const normalized = component as DeepPartial<ContractComponent> & { id?: number | null };
        if (normalized && !normalized.id) {
            normalized.id = undefined;
        }
        return normalized;
    }

    public findOrSave(title: string, dryRun = false): Observable<Contract> {
        if (!title) return of(null);
        const label = title;
        return from(this.repository.findOne({ where: { label: ILike(label) } })).pipe(concatMap(ge => {
            return iif(() => !!ge, of(ge), defer(() => from(dryRun ? of(null) : this.repository.save({ label: label }))));
        }));
    }

    public async index(reporting_year: number): Promise<ContractIndex[]> {
        let query = this.repository.createQueryBuilder('contract')
            .leftJoin('contract.publisher', 'publisher')
            .select('contract.id', 'id')
            .addSelect('contract.label', 'label')
            .addSelect('contract.start_date', 'start_date')
            .addSelect('contract.end_date', 'end_date')
            .addSelect('contract.invoice_amount', 'invoice_amount')
            .addSelect('publisher.label', 'publisher')
            .addSelect('COUNT(publication.id)', 'pub_count')
            .groupBy('contract.id')
            .addGroupBy('contract.start_date')
            .addGroupBy('contract.end_date')
            .addGroupBy('contract.invoice_amount')
            .addGroupBy('publisher.label');

        if (reporting_year) {
            const beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
            const endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
            query = query
                .leftJoin('contract.publications', 'publication', 'publication."contractId" = contract.id and publication.pub_date between :beginDate and :endDate', { beginDate, endDate });
        }
        else {
            query = query
                .leftJoin('contract.publications', 'publication', 'publication."contractId" = contract.id and publication.pub_date IS NULL and publication.pub_date_print IS NULL and publication.pub_date_accepted IS NULL and publication.pub_date_submitted IS NULL');
        }

        return query.getRawMany() as Promise<ContractIndex[]>;
    }

    public async combine(id1: number, ids: number[], alias_strings?: string[]) {
        return mergeEntities<Contract>({
            repository: this.repository,
            primaryId: id1,
            duplicateIds: ids,
            primaryOptions: { relations: { publisher: true, identifiers: true } },
            duplicateOptions: { relations: { publisher: true, publications: true, identifiers: true } },
            mergeContext: {
                field: 'contract',
                service: this.publicationService,
                alias_strings,
            },
            afterSave: async ({ duplicateIds, defaultDelete }) => {
                if (duplicateIds.length > 0) {
                    await this.idRepository.delete({ entity: { id: In(duplicateIds) } });
                }

                await defaultDelete();
            },
        });
    }

    public async delete(insts: Contract[]) {
        for (const inst of insts) {
            const conE: Contract = await this.repository.findOne({ where: { id: inst.id }, relations: { publisher: true, publications: true }, withDeleted: true });
            const pubs = [];
            if (conE.publications) {
                for (const pub of conE.publications) {
                    pubs.push({ id: pub.id, contract: null });
                }
            }

            await this.publicationService.save(pubs);
        }
        return await this.repository.delete(insts.map(p => p.id));
    }

    private getContractComponentRelations(): FindOptionsRelations<ContractComponent> {
        return {
            contract: true,
            invoices: true,
            pre_invoices: true,
            oa_categories: true,
            pub_types: true,
            greater_entities: true,
            cost_types: true,
        };
    }

    private normalizeContractComponents(contract: Contract) {
        if (!contract?.components) {
            return contract;
        }

        return {
            ...contract,
            components: contract.components.map(component => this.validateAndNormalizeContractComponent(component)),
        };
    }

    private validateAndNormalizeContractComponent(component: DeepPartial<ContractComponent>) {
        const normalizedComponent = {
            ...component,
            contract_model_params: component?.contract_model_params,
        };

        if (normalizedComponent.contract_model === undefined || normalizedComponent.contract_model === null) {
            if (normalizedComponent.contract_model_params !== undefined && normalizedComponent.contract_model_params !== null) {
                throw new BadRequestException('contract_model_params requires contract_model');
            }
            return normalizedComponent;
        }

        try {
            normalizedComponent.contract_model_params = parseContractModelParams(
                normalizedComponent.contract_model,
                normalizedComponent.contract_model_params,
            );
            return normalizedComponent;
        } catch (error) {
            this.throwContractComponentValidationError(error);
        }
    }

    private throwContractComponentValidationError(error: unknown): never {
        if (error instanceof ZodError) {
            throw new BadRequestException({
                message: 'Validation failed',
                details: error.issues.map(issue => ({
                    path: issue.path.join('.'),
                    message: issue.message,
                    code: issue.code,
                })),
            });
        }

        throw error;
    }
}
