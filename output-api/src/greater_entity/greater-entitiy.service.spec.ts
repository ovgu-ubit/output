import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { GreaterEntityService } from './greater-entitiy.service';
import { GreaterEntity } from './GreaterEntity.entity';
import { GEIdentifier } from './GEIdentifier.entity';
import { PublicationService } from '../publication/core/publication.service';
import { AppConfigService } from '../config/app-config.service';
describe('GreaterEntityService', () => {
    let service: GreaterEntityService;
    let repository: jest.Mocked<Partial<Repository<GreaterEntity>>>;
    let identifierRepository: jest.Mocked<Partial<Repository<GEIdentifier>>>;
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
                GreaterEntityService,
                { provide: getRepositoryToken(GreaterEntity), useValue: repository },
                { provide: getRepositoryToken(GEIdentifier), useValue: identifierRepository },
                { provide: PublicationService, useValue: publicationService },
                { provide: AppConfigService, useValue: { get: jest.fn() } },
            ],
        }).compile();

        service = module.get(GreaterEntityService);
    });

    it('combines greater entities by merging identifiers and unifying publication links', async () => {
        const primary: GreaterEntity = {
            id: 41,
            label: 'Primary GE',
            rating: 'A',
            doaj_since: null,
            doaj_until: null,
            identifiers: [{ id: 1, value: 'ID-A', type: 'type-a', entity: { id: 41 } }] as any,
            publications: [{ id: 50 }] as any,
        } as GreaterEntity;
        const duplicateA: GreaterEntity = {
            id: 42,
            label: 'Duplicate A',
            doaj_since: new Date('2021-01-01'),
            doaj_until: new Date('2022-01-01'),
            identifiers: [{ id: 2, value: 'ID-B', type: 'type-b', entity: { id: 42 } }] as any,
            publications: [{ id: 51, greater_entity: { id: 42 } }] as any,
        } as GreaterEntity;
        const duplicateB: GreaterEntity = {
            id: 43,
            label: 'Duplicate B',
            doaj_since: null,
            doaj_until: null,
            identifiers: [{ id: 3, value: 'ID-C', type: 'type-c', entity: { id: 43 } }] as any,
            publications: [{ id: 52, greater_entity: { id: 43 } }] as any,
        } as GreaterEntity;

        const byId = new Map<number, GreaterEntity>([
            [primary.id, primary],
            [duplicateA.id, duplicateA],
            [duplicateB.id, duplicateB],
        ]);

        repository.findOne.mockImplementation(async ({ where }: any) => byId.get(where.id));
        repository.save.mockImplementation(async entity => entity as GreaterEntity);
        repository.delete!.mockResolvedValue(undefined as never);
        identifierRepository.delete!.mockResolvedValue(undefined as never);
        publicationService.save.mockResolvedValue(undefined);

        const combined = await service.combine(41, [42, 43]);

        expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
            id: 41,
            label: 'Primary GE',
            doaj_since: new Date('2021-01-01'),
            doaj_until: new Date('2022-01-01'),
            identifiers: expect.arrayContaining([
                expect.objectContaining({ value: 'ID-A' }),
                expect.objectContaining({ value: 'ID-B' }),
                expect.objectContaining({ value: 'ID-C' }),
            ]),
        }));
        expect(combined).toEqual(expect.objectContaining({ doaj_since: new Date('2021-01-01') }));
        expect(publicationService.save).toHaveBeenCalledWith([
            expect.objectContaining({ id: 51, greater_entity: expect.objectContaining({ id: 41 }) }),
        ]);
        expect(publicationService.save).toHaveBeenCalledWith([
            expect.objectContaining({ id: 52, greater_entity: expect.objectContaining({ id: 41 }) }),
        ]);
        expect(identifierRepository.delete).toHaveBeenCalled();
        expect(repository.delete).toHaveBeenCalledWith([42, 43]);
    });
});
