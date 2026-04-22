import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { ApiErrorCode } from '../../../output-interfaces/ApiError';
import { ContractService } from './contract.service';
import { Contract } from './Contract.entity';
import { ContractIdentifier } from './ContractIdentifier.entity';
import { PublicationService } from '../publication/core/publication.service';
import { AppConfigService } from '../config/app-config.service';
import { ContractComponent } from './ContractComponent.entity';
import { InvoiceKind, ContractModel } from '../../../output-interfaces/Publication';
import { Invoice } from '../invoice/Invoice.entity';
import { EditLockOwnerStore } from '../common/edit-lock';

const expectApiError = async (
    promise: Promise<unknown>,
    expected: {
        statusCode: number;
        code: ApiErrorCode;
    },
) => {
    try {
        await promise;
        fail(`Expected promise to reject with ${expected.code}`);
    } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getResponse()).toMatchObject(expected);
    }
};

describe('ContractService', () => {
    let service: ContractService;
    let repository: jest.Mocked<Partial<Repository<Contract>>>;
    let identifierRepository: jest.Mocked<Partial<Repository<ContractIdentifier>>>;
    let componentRepository: jest.Mocked<Partial<Repository<ContractComponent>>>;
    let invoiceRepository: { find: jest.Mock, save: jest.Mock };
    let publicationService: { save: jest.Mock };
    let dataSource: { transaction: jest.Mock };

    beforeEach(async () => {
        repository = {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
        };
        identifierRepository = {
            delete: jest.fn(),
            save: jest.fn(),
        };
        componentRepository = {
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
        };
        invoiceRepository = {
            find: jest.fn().mockResolvedValue([]),
            save: jest.fn(),
        };
        publicationService = {
            save: jest.fn(),
        };
        dataSource = {
            transaction: jest.fn().mockImplementation(async (cb) => {
                const manager = {
                    save: jest.fn().mockImplementation(async (entity, obj) => {
                        if (entity && obj) { // entity-based save
                            if (entity === Contract) return repository.save(obj);
                            if (entity === ContractComponent) return componentRepository.save(obj);
                            if (entity === Invoice) return invoiceRepository.save(obj);
                            return repository.save(obj);
                        }
                        return repository.save(entity); // object-based save
                    }),
                    delete: jest.fn().mockImplementation(async (entity, criteria) => {
                        if (criteria) {
                             if (entity === Contract) return repository.delete(criteria);
                             if (entity === ContractComponent) return componentRepository.delete(criteria);
                             if (entity === ContractIdentifier) return identifierRepository.delete(criteria);
                             return repository.delete(criteria);
                        }
                        return repository.delete(entity);
                    }),
                    getRepository: jest.fn().mockImplementation((entity) => {
                        if (entity === Contract) return repository;
                        if (entity === ContractIdentifier) return identifierRepository;
                        if (entity === ContractComponent) return componentRepository;
                        if (entity === Invoice) return invoiceRepository;
                        return repository;
                    }),
                    findOne: repository.findOne,
                };
                return cb(manager);
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ContractService,
                { provide: getRepositoryToken(Contract), useValue: repository },
                { provide: getRepositoryToken(ContractIdentifier), useValue: identifierRepository },
                { provide: getRepositoryToken(ContractComponent), useValue: componentRepository },
                { provide: getRepositoryToken(Invoice), useValue: invoiceRepository },
                { provide: PublicationService, useValue: publicationService },
                { provide: AppConfigService, useValue: { get: jest.fn() } },
                { provide: DataSource, useValue: dataSource },
            ],
        }).compile();

        service = module.get(ContractService);
        EditLockOwnerStore.clear();
    });

    it('saves a contract component with validated model params', async () => {
        const component = {
            contract: { id: 1 },
            label: 'Discount component',
            contract_model: ContractModel.DISCOUNT,
            contract_model_version: 1,
            contract_model_params: {
                percentage: 15,
                service_fee: 50,
            },
        } as ContractComponent;

        componentRepository.save!.mockImplementation(async entity => entity as ContractComponent);

        const saved = await service.saveComponent(component);

        expect(componentRepository.save).toHaveBeenCalledWith(expect.objectContaining({
            contract: { id: 1 },
            contract_model_params: {
                percentage: 15,
                service_fee: 50,
            },
            linked_invoices: [],
        }));
        expect(saved).toEqual(expect.objectContaining({
            label: 'Discount component',
            invoices: [],
            pre_invoices: [],
        }));
    });

    it('persists invoices and pre_invoices with distinct invoice kinds', async () => {
        componentRepository.save!.mockImplementation(async entity => entity as ContractComponent);

        await service.saveComponent({
            contract: { id: 1 } as Contract,
            label: 'Typed invoices',
            invoices: [{ id: 10, number: 'INV-1' } as Invoice],
            pre_invoices: [{ id: 11, number: 'PRE-1' } as Invoice],
        } as ContractComponent);

        expect(componentRepository.save).toHaveBeenCalledWith(expect.objectContaining({
            linked_invoices: [
                expect.objectContaining({ id: 10, invoice_kind: InvoiceKind.INVOICE }),
                expect.objectContaining({ id: 11, invoice_kind: InvoiceKind.PRE_INVOICE }),
            ],
        }));
    });

    it('rejects contract component params that do not match the selected model', async () => {
        await expect(service.saveComponent({
            contract: { id: 1 } as Contract,
            label: 'Broken component',
            contract_model: ContractModel.FLATRATE,
            contract_model_version: 1,
            contract_model_params: {
                limit_type: 'budget',
                distribution_formula: 'service_fee',
                service_fee: 50,
            },
        } as ContractComponent)).rejects.toBeInstanceOf(BadRequestException);

        expect(componentRepository.save).not.toHaveBeenCalled();
    });

    it('rejects contract component params when no model is selected', async () => {
        await expect(service.saveComponent({
            contract: { id: 1 } as Contract,
            label: 'Broken component',
            contract_model_params: {
                percentage: 10,
            },
        } as ContractComponent)).rejects.toBeInstanceOf(BadRequestException);

        expect(componentRepository.save).not.toHaveBeenCalled();
    });

    it('rejects the same invoice id in invoices and pre_invoices', async () => {
        await expect(service.saveComponent({
            contract: { id: 1 } as Contract,
            label: 'Broken invoices',
            invoices: [{ id: 10 } as Invoice],
            pre_invoices: [{ id: 10 } as Invoice],
        } as ContractComponent)).rejects.toBeInstanceOf(BadRequestException);

        expect(componentRepository.save).not.toHaveBeenCalled();
    });

    it('returns a structured not-found error when updating a missing contract component', async () => {
        componentRepository.findOne!.mockResolvedValue(null as never);

        await expectApiError(service.updateComponent({
            id: 999,
            label: 'Missing Component',
        } as ContractComponent), {
            statusCode: 404,
            code: ApiErrorCode.NOT_FOUND,
        });

        expect(componentRepository.save).not.toHaveBeenCalled();
    });

    it('returns a structured invalid-request error when creating a contract component with a supplied id', async () => {
        await expectApiError(service.saveComponent({
            id: 999,
            contract: { id: 1 } as Contract,
            label: 'Should Fail',
        } as ContractComponent), {
            statusCode: 400,
            code: ApiErrorCode.INVALID_REQUEST,
        });

        expect(componentRepository.save).not.toHaveBeenCalled();
    });

    it('creates contracts without requiring an existing row', async () => {
        const contract = {
            label: 'New Contract',
            publisher: null,
            identifiers: [{ value: 'abc-1', type: 'LOCAL' }],
        } as unknown as Contract;

        repository.save!.mockImplementation(async entity => ({
            ...(entity as Contract),
            id: 11,
        }) as Contract);

        const saved = await service.save(contract);

        expect(repository.findOne).not.toHaveBeenCalled();
        expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
            label: 'New Contract',
            identifiers: [
                expect.objectContaining({
                    id: undefined,
                    value: 'ABC-1',
                    type: 'local',
                }),
            ],
        }));
        expect(saved).toEqual(expect.objectContaining({ id: 11 }));
    });

    it('returns a structured not-found error when updating a missing contract', async () => {
        repository.findOne!.mockResolvedValue(null as never);

        await expectApiError(service.save({
            id: 999,
            label: 'Missing Contract',
        } as Contract), {
            statusCode: 404,
            code: ApiErrorCode.NOT_FOUND,
        });
    });

    it('allows releasing a lock after loading a contract for the same user', async () => {
        repository.findOne!
            .mockResolvedValueOnce({ id: 11, label: 'Contract', locked_at: null } as Contract)
            .mockResolvedValueOnce({ id: 11, label: 'Contract', locked_at: new Date('2026-04-10T10:00:00Z') } as Contract)
            .mockResolvedValueOnce({ id: 11, label: 'Contract', identifiers: [], components: [] } as unknown as Contract);
        repository.update!.mockResolvedValue({ affected: 1 } as any);
        repository.save!.mockImplementation(async entity => entity as Contract);

        const loaded = await service.one(11, true, 'alice');
        const unlocked = await service.update({ id: 11, locked_at: null } as Contract, 'alice');

        expect(repository.update).toHaveBeenCalled();
        expect(loaded).toEqual(expect.objectContaining({ id: 11, locked_at: undefined }));
        expect(unlocked).toEqual(expect.objectContaining({ id: 11, locked_at: null }));
    });

    it('saves contract components embedded in a contract with validated params', async () => {
        const contract = {
            label: 'Contract With Components',
            publisher: null,
            components: [{
                label: 'PAR component',
                contract_model: ContractModel.PUBLISH_AND_READ,
                contract_model_version: 1,
                contract_model_params: {
                    par_fee: 2000,
                    service_fee: 125,
                },
                invoices: [{ id: 20 } as Invoice],
                pre_invoices: [{ id: 21 } as Invoice],
            }],
        } as unknown as Contract;

        repository.save!.mockImplementation(async entity => ({
            ...(entity as Contract),
            id: 11,
            components: (entity as Contract).components?.map((component, index) => ({
                ...component,
                id: index + 1,
            })) ?? [],
        }) as Contract);

        const saved = await service.save(contract);

        expect(componentRepository.save).not.toHaveBeenCalled();
        expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
            label: 'Contract With Components',
            components: [expect.objectContaining({
                id: undefined,
                contract_model_params: {
                    par_fee: 2000,
                    service_fee: 125,
                },
                linked_invoices: [
                    expect.objectContaining({ id: 20, invoice_kind: InvoiceKind.INVOICE }),
                    expect.objectContaining({ id: 21, invoice_kind: InvoiceKind.PRE_INVOICE }),
                ],
            })],
        }));
        expect(saved).toEqual(expect.objectContaining({
            id: 11,
            components: [expect.objectContaining({
                id: 1,
                invoices: [expect.objectContaining({ id: 20, invoice_kind: InvoiceKind.INVOICE })],
                pre_invoices: [expect.objectContaining({ id: 21, invoice_kind: InvoiceKind.PRE_INVOICE })],
                linked_invoices: undefined,
            })],
        }));
    });

    it('awaits identifier and component deletions when updating a contract', async () => {
        const contract = {
            id: 11,
            label: 'Contract With Components',
            components: [{ id: 2, label: 'Existing component' }],
            identifiers: [{ id: 2, value: 'new', type: 'local' }],
        } as unknown as Contract;

        repository.findOne!.mockResolvedValue({
            id: 11,
            identifiers: [{ id: 1, value: 'old', type: 'legacy' }],
            components: [{ id: 1, label: 'Old component' }],
        } as unknown as Contract);
        repository.save!.mockImplementation(async entity => ({
            ...(entity as Contract),
            components: [{ id: 2, label: 'Existing component' }],
            identifiers: [{ id: 2, value: 'new', type: 'local' }],
        }) as Contract);

        let identifierDeleteCompleted = false;
        let componentDeleteCompleted = false;

        identifierRepository.delete!.mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, 15));
            identifierDeleteCompleted = true;
            return undefined as never;
        });
        componentRepository.delete!.mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, 15));
            componentDeleteCompleted = true;
            return undefined as never;
        });

        await service.save(contract);

        expect(repository.findOne).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 11 },
            relations: { identifiers: true, components: true },
        }));
        expect(identifierRepository.delete).toHaveBeenCalledWith(1);
        expect(invoiceRepository.find).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                contract_component: expect.any(Object),
            }),
        }));
        expect(componentRepository.delete).toHaveBeenCalledWith([1]);
        expect(identifierDeleteCompleted).toBe(true);
        expect(componentDeleteCompleted).toBe(true);
    });
    it('lists contract components and splits linked invoices by invoice kind', async () => {
        componentRepository.find!.mockResolvedValue([{
            id: 1,
            label: 'Component',
            linked_invoices: [
                { id: 30, invoice_kind: InvoiceKind.INVOICE, number: 'INV' } as Invoice,
                { id: 31, invoice_kind: InvoiceKind.PRE_INVOICE, number: 'PRE' } as Invoice,
            ],
        } as ContractComponent]);

        const components = await service.getComponents(42);

        expect(componentRepository.find).toHaveBeenCalledWith(expect.objectContaining({
            where: { contract: { id: 42 } },
        }));
        expect(components).toEqual([
            expect.objectContaining({
                invoices: [expect.objectContaining({ id: 30, number: 'INV' })],
                pre_invoices: [expect.objectContaining({ id: 31, number: 'PRE' })],
                linked_invoices: undefined,
            }),
        ]);
    });

    it('detaches linked invoices before deleting contract components', async () => {
        invoiceRepository.find!.mockResolvedValue([
            { id: 101, contract_component: { id: 7 } as ContractComponent },
        ] as Invoice[]);
        invoiceRepository.save!.mockResolvedValue(undefined as never);
        componentRepository.delete!.mockResolvedValue(undefined as never);

        await service.deleteComponents([{ id: 7 }, { id: 8 }] as ContractComponent[]);

        expect(invoiceRepository.find).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                contract_component: expect.any(Object),
            }),
        }));
        expect(invoiceRepository.save).toHaveBeenCalledWith([
            { id: 101, contract_component: null },
        ]);
        expect(componentRepository.delete).toHaveBeenCalledWith([7, 8]);
    });

    it('merges contracts by concatenating identifiers and reassigning publications', async () => {
        const primary: Contract = {
            id: 11,
            label: 'Primary Contract',
            start_date: new Date('2020-01-01'),
            invoice_amount: null,
            publisher: null,
            publications: [{ id: 30 }] as any,
            identifiers: [{ id: 1, value: 'ABC', type: 'internal', entity: { id: 11 } }] as any,
        } as Contract;
        const duplicateA: Contract = {
            id: 12,
            label: 'Duplicate A',
            invoice_amount: 100,
            publisher: { id: 2, label: 'Publisher' } as any,
            publications: [{ id: 31, contract: { id: 12 } }] as any,
            identifiers: [{ id: 2, value: 'DEF', type: 'external', entity: { id: 12 } }] as any,
        } as Contract;
        const duplicateB: Contract = {
            id: 13,
            label: 'Duplicate B',
            invoice_amount: 200,
            publisher: null,
            publications: [{ id: 32, contract: { id: 13 } }] as any,
            identifiers: [],
        } as Contract;

        const byId = new Map<number, Contract>([
            [primary.id, primary],
            [duplicateA.id, duplicateA],
            [duplicateB.id, duplicateB],
        ]);

        repository.findOne!.mockImplementation(async ({ where, relations }: any) => {
            const entity = byId.get(where.id);
            if (!entity) {
                return undefined as never;
            }

            return {
                ...entity,
                ...(relations?.components ? { components: [] } : {}),
            } as Contract;
        });
        repository.save!.mockImplementation(async entity => {
            const merged = entity as Contract;
            const next = {
                ...(byId.get(merged.id) ?? {}),
                ...merged,
            } as Contract;
            byId.set(merged.id, next);
            return next;
        });
        repository.delete!.mockResolvedValue(undefined as never);
        publicationService.save.mockResolvedValue(undefined);
        identifierRepository.delete!.mockResolvedValue(undefined as never);
        componentRepository.save!.mockImplementation(async entity => entity as ContractComponent);

        const combined = await service.combine(11, [12, 13], ['alias']);

        expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
            id: 11,
            label: 'Primary Contract',
            start_date: new Date('2020-01-01'),
            invoice_amount: 100,
            publisher: expect.objectContaining({ id: 2 }),
            identifiers: expect.arrayContaining([
                expect.objectContaining({ value: 'ABC' }),
                expect.objectContaining({ value: 'DEF' }),
            ]),
        }));
        expect(combined).toEqual(expect.objectContaining({ invoice_amount: 100 }));
        expect(publicationService.save).toHaveBeenCalledTimes(2);
        expect(publicationService.save).toHaveBeenCalledWith([
            expect.objectContaining({ id: 31, contract: expect.objectContaining({ id: 11 }) }),
        ], expect.anything());
        expect(publicationService.save).toHaveBeenCalledWith([
            expect.objectContaining({ id: 32, contract: expect.objectContaining({ id: 11 }) }),
        ], expect.anything());
        expect(identifierRepository.delete).toHaveBeenCalled();
        expect(repository.delete).toHaveBeenCalledWith([12, 13]);
    });

    it('reassigns duplicate contract components to the primary contract before deleting duplicates', async () => {
        const primary: Contract = {
            id: 11,
            label: 'Primary Contract',
            publisher: null,
            identifiers: [],
            publications: [],
        } as Contract;
        const duplicate: Contract = {
            id: 12,
            label: 'Duplicate Contract',
            publisher: null,
            identifiers: [],
            publications: [],
        } as Contract;

        const byId = new Map<number, Contract>([
            [primary.id, primary],
            [duplicate.id, duplicate],
        ]);
        const componentsByContract = new Map<number, ContractComponent[]>([
            [11, [{ id: 1, label: 'Primary Component', contract: { id: 11 } as Contract } as ContractComponent]],
            [12, [{ id: 2, label: 'Duplicate Component', contract: { id: 12 } as Contract } as ContractComponent]],
        ]);

        repository.findOne!.mockImplementation(async ({ where, relations }: any) => {
            const entity = byId.get(where.id);
            if (!entity) {
                return undefined as never;
            }

            return {
                ...entity,
                ...(relations?.components ? { components: componentsByContract.get(where.id) ?? [] } : {}),
            } as Contract;
        });
        repository.save!.mockImplementation(async entity => {
            const merged = entity as Contract;
            const next = {
                ...(byId.get(merged.id) ?? {}),
                ...merged,
            } as Contract;
            byId.set(merged.id, next);
            return next;
        });
        repository.delete!.mockImplementation(async ids => {
            for (const id of ids as number[]) {
                byId.delete(id);
                componentsByContract.delete(id);
            }
            return undefined as never;
        });
        publicationService.save.mockResolvedValue(undefined);
        identifierRepository.delete!.mockResolvedValue(undefined as never);
        componentRepository.find!.mockResolvedValue(componentsByContract.get(12) ?? []);
        componentRepository.save!.mockImplementation(async (entities: any) => {
            const updates = Array.isArray(entities) ? entities : [entities];
            for (const update of updates) {
                for (const [contractId, components] of componentsByContract.entries()) {
                    const existing = components.find(component => component.id === update.id);
                    if (!existing) {
                        continue;
                    }

                    componentsByContract.set(contractId, components.filter(component => component.id !== update.id));
                    const targetContractId = update.contract.id;
                    componentsByContract.set(targetContractId, [
                        ...(componentsByContract.get(targetContractId) ?? []),
                        { ...existing, ...update } as ContractComponent,
                    ]);
                    break;
                }
            }
            return entities as any;
        });

        const combined = await service.combine(11, [12]);

        expect(componentRepository.find).toHaveBeenCalled();
        expect(componentRepository.save).toHaveBeenCalledWith([
            {
                id: 2,
                contract: { id: 11 },
            },
        ]);
        expect(repository.delete).toHaveBeenCalledWith([12]);
        expect(combined).toEqual(expect.objectContaining({
            components: expect.arrayContaining([
                expect.objectContaining({ id: 1, label: 'Primary Component' }),
                expect.objectContaining({ id: 2, label: 'Duplicate Component' }),
            ]),
        }));
    });
});
