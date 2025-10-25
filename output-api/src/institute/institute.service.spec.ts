import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { InstituteService } from './institute.service';
import { Institute } from './Institute';
import { AuthorPublication } from '../publication/relations/AuthorPublication';
import { Author } from '../author/Author';
import { AliasInstitute } from './AliasInstitute';
import { AppConfigService } from '../config/app-config.service';
import { AliasLookupService } from '../common/alias-lookup.service';
describe('InstituteService', () => {
    let service: InstituteService;
    let repository: jest.Mocked<Partial<Repository<Institute>>>;
    let manager: { getTreeRepository: jest.Mock };
    let pubAutRepository: jest.Mocked<Partial<Repository<AuthorPublication>>>;
    let authorRepository: jest.Mocked<Partial<Repository<Author>>>;
    let aliasRepository: jest.Mocked<Partial<Repository<AliasInstitute>>>;

    beforeEach(async () => {
        repository = {
            findOne: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
        };
        manager = {
            getTreeRepository: jest.fn().mockReturnValue(repository),
        };
        pubAutRepository = {
            save: jest.fn(),
        };
        authorRepository = {
            save: jest.fn(),
        };
        aliasRepository = {
            delete: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InstituteService,
                { provide: EntityManager, useValue: manager },
                { provide: getRepositoryToken(AuthorPublication), useValue: pubAutRepository },
                { provide: getRepositoryToken(Author), useValue: authorRepository },
                { provide: getRepositoryToken(AliasInstitute), useValue: aliasRepository },
                { provide: AliasLookupService, useValue: { findCanonicalElement: jest.fn() } },
                { provide: AppConfigService, useValue: { get: jest.fn() } },
            ],
        }).compile();

        service = module.get(InstituteService);
    });

    it('combines institutes by merging hierarchy metadata and updating author affiliations', async () => {
        expect(manager.getTreeRepository).toHaveBeenCalledWith(Institute);

        const primary: Institute = {
            id: 31,
            label: 'Primary Institute',
            short_label: 'Primary',
            aliases: [{ id: 1, alias: 'existing', elementId: 31 } as any],
            super_institute: null,
            authors: [{ id: 501, institutes: [{ id: 31 }] as any[] } as any],
            authorPublications: [],
        } as Institute;
        const duplicateA: Institute = {
            id: 32,
            label: 'Duplicate A',
            short_label: 'Dup A',
            aliases: [{ id: 2, alias: 'dup', elementId: 32 } as any],
            super_institute: { id: 100, label: 'Parent' } as any,
            authors: [{ id: 502, institutes: [{ id: 32 }] as any[] } as any],
            authorPublications: [{ id: 601, institute: { id: 32 } }] as any,
        } as Institute;
        const duplicateB: Institute = {
            id: 33,
            label: 'Duplicate B',
            aliases: [],
            super_institute: null,
            authors: [],
            authorPublications: [],
        } as Institute;

        const byId = new Map<number, Institute>([
            [primary.id, primary],
            [duplicateA.id, duplicateA],
            [duplicateB.id, duplicateB],
        ]);

        repository.findOne.mockImplementation(async ({ where }: any) => byId.get(where.id));
        repository.save.mockImplementation(async entity => entity as Institute);
        repository.delete!.mockResolvedValue(undefined as never);
        pubAutRepository.save!.mockResolvedValue(undefined as never);
        authorRepository.save!.mockResolvedValue(undefined as never);

        const combined = await service.combine(31, [32, 33], ['alias-one']);

        expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
            id: 31,
            label: 'Primary Institute',
            super_institute: expect.objectContaining({ id: 100 }),
            aliases: expect.arrayContaining([
                expect.objectContaining({ alias: 'existing' }),
                expect.objectContaining({ alias: 'dup' }),
                expect.objectContaining({ alias: 'alias-one', elementId: 31 }),
            ]),
        }));
        expect(combined).toEqual(expect.objectContaining({ super_institute: expect.objectContaining({ id: 100 }) }));
        expect(pubAutRepository.save).toHaveBeenCalledWith({ id: 601, institute: expect.objectContaining({ id: 31 }) });
        expect(authorRepository.save).toHaveBeenCalledWith({
            id: 502,
            institutes: expect.arrayContaining([
                expect.objectContaining({ id: 31 }),
            ]),
        });
        expect(repository.delete).toHaveBeenCalledWith([32, 33]);
    });
});
