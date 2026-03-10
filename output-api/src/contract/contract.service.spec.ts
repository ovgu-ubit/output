import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ContractService } from './contract.service';
import { Contract } from './Contract.entity';
import { ContractIdentifier } from './ContractIdentifier.entity';
import { PublicationService } from '../publication/core/publication.service';
import { AppConfigService } from '../config/app-config.service';
import { ContractComponent } from './ContractComponent.entity';
import { ContractModel } from '../../../output-interfaces/Publication';
import { Invoice } from '../invoice/Invoice.entity';

describe('ContractService', () => {
    let service: ContractService;
    let repository: jest.Mocked<Partial<Repository<Contract>>>;
    let identifierRepository: jest.Mocked<Partial<Repository<ContractIdentifier>>>;
    let componentRepository: jest.Mocked<Partial<Repository<ContractComponent>>>;
    let invoiceRepository: jest.Mocked<Partial<Repository<Invoice>>>;
    let publicationService: { save: jest.Mock };

    beforeEach(async () => {
        repository = {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
        };
        identifierRepository = {
            delete: jest.fn(),
            save: jest.fn(),
        };
        componentRepository = {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
        };
        invoiceRepository = {
            find: jest.fn(),
            save: jest.fn(),
        };
        publicationService = {
            save: jest.fn(),
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
            ],
        }).compile();

        service = module.get(ContractService);
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
        }));
        expect(saved).toEqual(expect.objectContaining({
            label: 'Discount component',
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

    it('saves contract components embedded in a contract with validated params', async () => {
        const contract = {
            id: 11,
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
            }],
        } as unknown as Contract;

        repository.findOne!.mockResolvedValue(undefined as never);
        repository.save!.mockImplementation(async entity => entity as Contract);

        const saved = await service.save(contract);

        expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
            components: [expect.objectContaining({
                contract_model_params: {
                    par_fee: 2000,
                    service_fee: 125,
                },
            })],
        }));
        expect(saved).toEqual(expect.objectContaining({ id: 11 }));
    });

    it('lists contract components and can filter by contract id', async () => {
        componentRepository.find!.mockResolvedValue([] as ContractComponent[]);

        await service.getComponents(42);

        expect(componentRepository.find).toHaveBeenCalledWith(expect.objectContaining({
            where: { contract: { id: 42 } },
        }));
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

        repository.findOne!.mockImplementation(async ({ where }: any) => byId.get(where.id));
        repository.save!.mockImplementation(async entity => entity as Contract);
        repository.delete!.mockResolvedValue(undefined as never);
        publicationService.save.mockResolvedValue(undefined);
        identifierRepository.delete!.mockResolvedValue(undefined as never);

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
        ]);
        expect(publicationService.save).toHaveBeenCalledWith([
            expect.objectContaining({ id: 32, contract: expect.objectContaining({ id: 11 }) }),
        ]);
        expect(identifierRepository.delete).toHaveBeenCalled();
        expect(repository.delete).toHaveBeenCalledWith([12, 13]);
    });
});
