import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { concatMap, defer, from, iif, Observable, of } from 'rxjs';
import { DeepPartial, FindManyOptions, FindOptionsRelations, FindOptionsWhere, ILike, In, Repository } from 'typeorm';
import { ZodError } from 'zod';
import { InvoiceKind } from '../../../output-interfaces/Publication';
import { ContractIndex } from '../../../output-interfaces/PublicationIndex';
import { AbstractEntityService } from '../common/abstract-entity.service';
import { createPersistenceHttpException } from '../common/api-error';
import { hasProvidedEntityId } from '../common/entity-id';
import { mergeEntities } from '../common/merge';
import { AppConfigService } from '../config/app-config.service';
import { Invoice } from '../invoice/Invoice.entity';
import { PublicationService } from '../publication/core/publication.service';
import { Contract } from './Contract.entity';
import { ContractComponent } from './ContractComponent.entity';
import { ContractIdentifier } from './ContractIdentifier.entity';
import { parseContractModelParams } from './contract-model-params.schema';

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
                linked_invoices: {
                    cost_items: true,
                },
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
        if (normalizedContract.components) {
            for (const c of normalizedContract.components) {
                if (!c.id) {
                    c.id = (await this.contractComponentRepository.save(c).catch(err => {
                        throw createPersistenceHttpException(err);
                    })).id;
                }
            }
        }
        if (normalizedContract.components && orig && orig.components) {
            orig.components.forEach(async c => {
                if (!normalizedContract.components.find(e => e.id === c.id)) await this.contractComponentRepository.delete(c.id);
            });
        }

        const savedContract = await this.repository.save(contract).catch((error: unknown) => {
            throw createPersistenceHttpException(error);
        });

        return this.splitContractComponentInvoicesForContract(savedContract);
    }

    public override async one(id: number, writer: boolean) {
        const contract = await super.one(id, writer);
        return this.splitContractComponentInvoicesForContract(contract);
    }

    public async saveComponent(component: DeepPartial<ContractComponent>) {
        const normalizedComponent = this.normalizeContractComponentForCreate(this.validateAndNormalizeContractComponent(component));

        if (!normalizedComponent.contract?.id) {
            throw new BadRequestException('contract.id is required to create a contract component');
        }

        const savedComponent = await this.contractComponentRepository.save(normalizedComponent).catch(err => {
            throw createPersistenceHttpException(err)
        });

        return this.splitContractComponentInvoices(savedComponent);
    }

    public async updateComponent(component: DeepPartial<ContractComponent>) {
        if (!component?.id) {
            throw new BadRequestException('id is required to update a contract component');
        }

        const normalizedComponent = this.validateAndNormalizeContractComponent(component);
        const savedComponent = await this.contractComponentRepository.save(normalizedComponent).catch(err => {
            throw createPersistenceHttpException(err)
        });

        return this.splitContractComponentInvoices(savedComponent);
    }

    public async getComponents(contractId?: number) {
        const options: FindManyOptions<ContractComponent> = {
            relations: this.getContractComponentRelations(),
        };

        if (contractId) {
            options.where = { contract: { id: contractId } } as FindOptionsWhere<ContractComponent>;
        }

        const components = await this.contractComponentRepository.find(options);
        return components.map(component => this.splitContractComponentInvoices(component));
    }

    public async oneComponent(id: number) {
        const component = await this.contractComponentRepository.findOne({
            where: { id },
            relations: this.getContractComponentRelations(),
        });

        return this.splitContractComponentInvoices(component);
    }

    public async deleteComponents(components: Pick<ContractComponent, 'id'>[]) {
        const componentIds = components?.map(component => component.id).filter((id): id is number => !!id);
        if (!components || !componentIds.length) {
            throw new BadRequestException('No valid component ids provided for deletion');
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
            linked_invoices: {
                cost_items: true
            },
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
        } as DeepPartial<ContractComponent> & { linked_invoices?: Invoice[] };

        this.ensureNoDuplicateInvoiceIds(component?.invoices ?? [], component?.pre_invoices ?? []);
        normalizedComponent.linked_invoices = this.mergeComponentInvoices(component);
        delete normalizedComponent.invoices;
        delete normalizedComponent.pre_invoices;

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

    private splitContractComponentInvoicesForContract(contract?: Contract | null) {
        if (!contract?.components) {
            return contract;
        }

        return {
            ...contract,
            components: contract.components.map(component => this.splitContractComponentInvoices(component)),
        };
    }

    private splitContractComponentInvoices(component?: ContractComponent | null) {
        if (!component) {
            return component;
        }

        const linkedInvoices = component.linked_invoices ?? [];
        const invoices = linkedInvoices
            .filter(invoice => this.normalizeInvoiceKind(invoice.invoice_kind) === InvoiceKind.INVOICE)
            .map(invoice => ({ ...invoice }));
        const preInvoices = linkedInvoices
            .filter(invoice => this.normalizeInvoiceKind(invoice.invoice_kind) === InvoiceKind.PRE_INVOICE)
            .map(invoice => ({ ...invoice }));

        return {
            ...component,
            invoices,
            pre_invoices: preInvoices,
            linked_invoices: undefined,
        };
    }

    private mergeComponentInvoices(component: DeepPartial<ContractComponent>) {
        const hasDerivedInvoiceLists = Object.prototype.hasOwnProperty.call(component ?? {}, 'invoices')
            || Object.prototype.hasOwnProperty.call(component ?? {}, 'pre_invoices');
        const invoices = component?.invoices ?? [];
        const preInvoices = component?.pre_invoices ?? [];

        if (!hasDerivedInvoiceLists) {
            return (component?.linked_invoices ?? []).map(invoice => ({
                ...invoice,
                invoice_kind: this.normalizeInvoiceKind(invoice.invoice_kind),
            }));
        }

        return [
            ...invoices.map(invoice => this.normalizeComponentInvoice(invoice, InvoiceKind.INVOICE)),
            ...preInvoices.map(invoice => this.normalizeComponentInvoice(invoice, InvoiceKind.PRE_INVOICE)),
        ];
    }

    private normalizeComponentInvoice(invoice: DeepPartial<Invoice>, invoiceKind: InvoiceKind): DeepPartial<Invoice> {
        return {
            ...invoice,
            invoice_kind: invoiceKind,
        };
    }

    private normalizeInvoiceKind(invoiceKind?: InvoiceKind) {
        return invoiceKind === InvoiceKind.PRE_INVOICE
            ? InvoiceKind.PRE_INVOICE
            : InvoiceKind.INVOICE;
    }

    private ensureNoDuplicateInvoiceIds(invoices: DeepPartial<Invoice>[], preInvoices: DeepPartial<Invoice>[]) {
        const invoiceIds = new Set(invoices.map(invoice => invoice?.id).filter((id): id is number => !!id));
        const duplicateId = preInvoices.find(invoice => invoice?.id && invoiceIds.has(invoice.id))?.id;

        if (duplicateId) {
            throw new BadRequestException(`Invoice ${duplicateId} cannot be assigned to invoices and pre_invoices at the same time`);
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

