import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PublicationTypeService } from './publication-type.service';
import { PublicationType } from './PublicationType';
import { AliasPubType } from './AliasPubType';
import { PublicationService } from '../publication/core/publication.service';
import { AppConfigService } from '../config/app-config.service';
describe('PublicationTypeService', () => {
    let service: PublicationTypeService;
    let repository: jest.Mocked<Partial<Repository<PublicationType>>>;
    let aliasRepository: jest.Mocked<Partial<Repository<AliasPubType>>>;
    let publicationService: { save: jest.Mock };

    beforeEach(async () => {
        repository = {
            findOne: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
        };
        aliasRepository = {
            delete: jest.fn(),
        };
        publicationService = {
            save: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PublicationTypeService,
                { provide: getRepositoryToken(PublicationType), useValue: repository },
                { provide: getRepositoryToken(AliasPubType), useValue: aliasRepository },
                { provide: PublicationService, useValue: publicationService },
                { provide: AppConfigService, useValue: { get: jest.fn() } },
            ],
        }).compile();

        service = module.get(PublicationTypeService);
    });

    it('combines publication types by merging aliases and preserving the primary label', async () => {
        const primary: PublicationType = {
            id: 4,
            label: 'Primary Type',
            review: null,
            aliases: [{ id: 1, alias: 'existing', elementId: 4 } as any],
            publications: [{ id: 2 }] as any,
        } as PublicationType;
        const duplicateA: PublicationType = {
            id: 7,
            label: 'Duplicate A',
            review: true,
            aliases: [{ id: 3, alias: 'dup-a', elementId: 7 } as any],
            publications: [{ id: 5, pub_type: { id: 7 } }] as any,
        } as PublicationType;
        const duplicateB: PublicationType = {
            id: 8,
            label: 'Duplicate B',
            review: false,
            aliases: [],
            publications: [{ id: 6, pub_type: { id: 8 } }] as any,
        } as PublicationType;

        const byId = new Map<number, PublicationType>([
            [primary.id, primary],
            [duplicateA.id, duplicateA],
            [duplicateB.id, duplicateB],
        ]);

        repository.findOne.mockImplementation(async ({ where }: any) => byId.get(where.id));
        repository.save.mockImplementation(async entity => entity as PublicationType);
        repository.delete!.mockResolvedValue(undefined as never);
        publicationService.save.mockResolvedValue(undefined);
        aliasRepository.delete!.mockResolvedValue(undefined as never);

        const combined = await service.combine(4, [7, 8], ['new-alias']);

        expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
            id: 4,
            label: 'Primary Type',
            review: true,
            aliases: expect.arrayContaining([
                expect.objectContaining({ alias: 'existing' }),
                expect.objectContaining({ alias: 'dup-a' }),
                expect.objectContaining({ alias: 'new-alias', elementId: 4 }),
            ]),
        }));
        expect(combined).toEqual(expect.objectContaining({ review: true }));
        expect(publicationService.save).toHaveBeenCalledTimes(2);
        expect(publicationService.save).toHaveBeenCalledWith([
            expect.objectContaining({ id: 5, pub_type: expect.objectContaining({ id: 4 }) }),
        ]);
        expect(publicationService.save).toHaveBeenCalledWith([
            expect.objectContaining({ id: 6, pub_type: expect.objectContaining({ id: 4 }) }),
        ]);
        expect(aliasRepository.delete).toHaveBeenCalledWith({ elementId: expect.anything() });
        expect(repository.delete).toHaveBeenCalledWith([7, 8]);
    });
});
