import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { InstituteService } from './institute.service';
import { Institute } from './Institute.entity';
import { AuthorPublication } from '../publication/relations/AuthorPublication.entity';
import { Author } from '../author/Author.entity';
import { AliasInstitute } from './AliasInstitute.entity';
import { AppConfigService } from '../config/app-config.service';
import { AliasLookupService } from '../common/alias-lookup.service';
import { EditLockOwnerStore } from '../common/edit-lock';
describe('InstituteService', () => {
    let service: InstituteService;
    let repository: jest.Mocked<Partial<Repository<Institute>>>;
    let manager: { getTreeRepository: jest.Mock };
    let pubAutRepository: jest.Mocked<Partial<Repository<AuthorPublication>>>;
    let authorRepository: jest.Mocked<Partial<Repository<Author>>>;
    let aliasRepository: jest.Mocked<Partial<Repository<AliasInstitute>>>;
    let configService: { get: jest.Mock };

    beforeEach(async () => {
        EditLockOwnerStore.clear();
        repository = {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
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
        configService = {
            get: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InstituteService,
                { provide: EntityManager, useValue: manager },
                { provide: getRepositoryToken(AuthorPublication), useValue: pubAutRepository },
                { provide: getRepositoryToken(Author), useValue: authorRepository },
                { provide: getRepositoryToken(AliasInstitute), useValue: aliasRepository },
                { provide: AliasLookupService, useValue: { findCanonicalElement: jest.fn() } },
                { provide: AppConfigService, useValue: configService },
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

    it('returns institute ids including all descendants without duplicates', async () => {
        const root = { id: 1, sub_institutes: [{ id: 2 }, { id: 3 }] } as Institute;
        const childA = { id: 2, sub_institutes: [{ id: 4 }] } as Institute;
        const childB = { id: 3, sub_institutes: [{ id: 4 }] } as Institute;
        const grandChild = { id: 4, sub_institutes: [] } as Institute;

        repository.find.mockResolvedValue([root, childA, childB, grandChild]);
        repository.findOne.mockImplementation(async ({ where }: any) => {
            if (where.id === 1) return root;
            if (where.id === 2) return childA;
            return null;
        });

        const ids = await service.findInstituteIdsIncludingSubInstitutes([1, 2]);

        expect(ids).toEqual([1, 2, 3, 4]);
    });

    it('keeps an institute editable for the same lock owner', async () => {
        const lockedAt = new Date();

        repository.findOne
            .mockResolvedValueOnce({ id: 9, locked_at: null } as Institute)
            .mockResolvedValueOnce({ id: 9, locked_at: lockedAt } as Institute);
        repository.update!.mockResolvedValue({ affected: 1 } as any);
        configService.get.mockResolvedValue(5);

        const first = await service.one(9, true, 'alice');
        const second = await service.one(9, true, 'alice');

        expect(repository.update).toHaveBeenCalledWith(
            expect.objectContaining({ id: 9, locked_at: expect.any(Object) }),
            expect.objectContaining({ locked_at: expect.any(Date) }),
        );
        expect(first?.locked_at).toBeUndefined();
        expect(second?.locked_at).toBeUndefined();
    });

    it('rejects saving an institute locked by another user', async () => {
        repository.findOne.mockResolvedValueOnce({ id: 10, locked_at: null } as Institute);
        repository.update!.mockResolvedValue({ affected: 1 } as any);
        repository.find.mockResolvedValue([{ id: 10, locked_at: new Date() } as Institute]);
        configService.get.mockResolvedValue(5);

        await service.one(10, true, 'alice');

        await expect(service.save([{ id: 10, label: 'Blocked' } as Institute], 'mallory'))
            .rejects.toBeInstanceOf(ConflictException);
        expect(repository.save).not.toHaveBeenCalled();
    });

    it('allows the institute lock owner to release an active lock', async () => {
        repository.findOne.mockResolvedValueOnce({ id: 11, locked_at: null } as Institute);
        repository.update!.mockResolvedValue({ affected: 1 } as any);
        repository.find.mockResolvedValue([{ id: 11, locked_at: new Date() } as Institute]);
        repository.save.mockResolvedValue({ id: 11, locked_at: null } as any);
        configService.get.mockResolvedValue(5);

        await service.one(11, true, 'alice');

        await expect(service.save([{ id: 11, locked_at: null } as Institute], 'alice'))
            .resolves.toMatchObject({ id: 11, locked_at: null });
    });
});
