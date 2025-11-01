import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ContractService } from './contract.service';
import { Contract } from './Contract.entity';
import { ContractIdentifier } from './ContractIdentifier.entity';
import { PublicationService } from '../publication/core/publication.service';
import { AppConfigService } from '../config/app-config.service';
describe('ContractService', () => {
    let service: ContractService;
    let repository: jest.Mocked<Partial<Repository<Contract>>>;
    let identifierRepository: jest.Mocked<Partial<Repository<ContractIdentifier>>>;
    let publicationService: { save: jest.Mock };

    beforeEach(async () => {
        repository = {
            findOne: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
        };
        identifierRepository = {
            delete: jest.fn(),
        };
        publicationService = {
            save: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ContractService,
                { provide: getRepositoryToken(Contract), useValue: repository },
                { provide: getRepositoryToken(ContractIdentifier), useValue: identifierRepository },
                { provide: PublicationService, useValue: publicationService },
                { provide: AppConfigService, useValue: { get: jest.fn() } },
            ],
        }).compile();

        service = module.get(ContractService);
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

        repository.findOne.mockImplementation(async ({ where }: any) => byId.get(where.id));
        repository.save.mockImplementation(async entity => entity as Contract);
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
