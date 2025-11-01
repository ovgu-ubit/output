import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PublisherService } from './publisher.service';
import { Publisher } from './Publisher.entity';
import { AliasPublisher } from './AliasPublisher.entity';
import { PublisherDOI } from './PublisherDOI.entity';
import { PublicationService } from '../publication/core/publication.service';
import { AppConfigService } from '../config/app-config.service';
import { AliasLookupService } from '../common/alias-lookup.service';
describe('PublisherService', () => {
    let service: PublisherService;
    let repository: jest.Mocked<Partial<Repository<Publisher>>>;
    let aliasRepository: jest.Mocked<Partial<Repository<AliasPublisher>>>;
    let doiRepository: jest.Mocked<Partial<Repository<PublisherDOI>>>;
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
        doiRepository = {
            delete: jest.fn(),
        };
        publicationService = {
            save: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PublisherService,
                { provide: getRepositoryToken(Publisher), useValue: repository },
                { provide: getRepositoryToken(AliasPublisher), useValue: aliasRepository },
                { provide: getRepositoryToken(PublisherDOI), useValue: doiRepository },
                { provide: PublicationService, useValue: publicationService },
                { provide: AliasLookupService, useValue: { findCanonicalElement: jest.fn() } },
                { provide: AppConfigService, useValue: { get: jest.fn() } },
            ],
        }).compile();

        service = module.get(PublisherService);
    });

    it('merges publisher data by combining aliases and DOI prefixes without losing the primary identity', async () => {
        const primary: Publisher = {
            id: 5,
            label: 'Primary Publisher',
            doi_prefixes: [{ id: 1, doi_prefix: '10.1000', publisherId: 5 } as any],
            aliases: [{ id: 1, alias: 'primary', elementId: 5 } as any],
            publications: [{ id: 21 }] as any,
        } as Publisher;
        const duplicateA: Publisher = {
            id: 9,
            label: 'Duplicate A',
            doi_prefixes: [{ id: 2, doi_prefix: '10.2000', publisherId: 9 } as any],
            aliases: [{ id: 3, alias: 'dup-a', elementId: 9 } as any],
            publications: [{ id: 22, publisher: { id: 9 } }] as any,
        } as Publisher;
        const duplicateB: Publisher = {
            id: 10,
            label: 'Duplicate B',
            doi_prefixes: [],
            aliases: [],
            publications: [{ id: 23, publisher: { id: 10 } }] as any,
        } as Publisher;

        const byId = new Map<number, Publisher>([
            [primary.id, primary],
            [duplicateA.id, duplicateA],
            [duplicateB.id, duplicateB],
        ]);

        repository.findOne.mockImplementation(async ({ where }: any) => byId.get(where.id));
        repository.save.mockImplementation(async entity => entity as Publisher);
        repository.delete!.mockResolvedValue(undefined as never);
        aliasRepository.delete!.mockResolvedValue(undefined as never);
        doiRepository.delete!.mockResolvedValue(undefined as never);
        publicationService.save.mockResolvedValue(undefined);

        const combined = await service.combine(5, [9, 10], ['new-alias']);

        expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
            id: 5,
            label: 'Primary Publisher',
            aliases: expect.arrayContaining([
                expect.objectContaining({ alias: 'primary' }),
                expect.objectContaining({ alias: 'dup-a' }),
                expect.objectContaining({ alias: 'new-alias', elementId: 5 }),
            ]),
            doi_prefixes: expect.arrayContaining([
                expect.objectContaining({ doi_prefix: '10.1000' }),
                expect.objectContaining({ doi_prefix: '10.2000' }),
            ]),
        }));
        expect(combined).toEqual(expect.objectContaining({ label: 'Primary Publisher' }));
        expect(publicationService.save).toHaveBeenCalledTimes(2);
        expect(publicationService.save).toHaveBeenCalledWith([
            expect.objectContaining({ id: 22, publisher: expect.objectContaining({ id: 5 }) }),
        ]);
        expect(publicationService.save).toHaveBeenCalledWith([
            expect.objectContaining({ id: 23, publisher: expect.objectContaining({ id: 5 }) }),
        ]);
        expect(aliasRepository.delete).toHaveBeenCalled();
        expect(doiRepository.delete).toHaveBeenCalled();
        expect(repository.delete).toHaveBeenCalledWith([9, 10]);
    });
});
