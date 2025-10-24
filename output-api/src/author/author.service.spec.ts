import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { of } from 'rxjs';
import { Repository, FindOperator } from 'typeorm';

import { AuthorService } from './author.service';
import { Author } from './Author';
import { AuthorPublication } from '../publication/relations/AuthorPublication';
import { AliasAuthorFirstName } from './AliasAuthorFirstName';
import { AliasAuthorLastName } from './AliasAuthorLastName';
import { InstituteService } from '../institute/institute.service';
import { AppConfigService } from '../config/app-config.service';
import { AliasLookupService } from '../common/alias-lookup.service';
import { mergeEntities } from '../common/merge';

jest.mock('../common/merge', () => ({
    mergeEntities: jest.fn(),
}));

describe('AuthorService', () => {
    let service: AuthorService;
    let repository: jest.Mocked<Partial<Repository<Author>>>;
    let pubAutRepository: jest.Mocked<Partial<Repository<AuthorPublication>>>;
    let aliasFirstNameRepository: jest.Mocked<Partial<Repository<AliasAuthorFirstName>>>;
    let aliasLastNameRepository: jest.Mocked<Partial<Repository<AliasAuthorLastName>>>;
    let instService: { findOrSave: jest.Mock };
    let configService: { get: jest.Mock };
    let aliasLookupService: { findAliases: jest.Mock };
    const mergeEntitiesMock = mergeEntities as jest.Mock;

    beforeEach(async () => {
        repository = {
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
        };
        pubAutRepository = {
            save: jest.fn(),
            delete: jest.fn(),
        };
        aliasFirstNameRepository = {
            delete: jest.fn(),
        };
        aliasLastNameRepository = {
            delete: jest.fn(),
        };
        instService = {
            findOrSave: jest.fn(),
        };
        configService = {
            get: jest.fn(),
        };
        aliasLookupService = {
            findAliases: jest.fn(),
        };

        mergeEntitiesMock.mockReset();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthorService,
                { provide: getRepositoryToken(Author), useValue: repository },
                { provide: getRepositoryToken(AuthorPublication), useValue: pubAutRepository },
                { provide: getRepositoryToken(AliasAuthorFirstName), useValue: aliasFirstNameRepository },
                { provide: getRepositoryToken(AliasAuthorLastName), useValue: aliasLastNameRepository },
                { provide: InstituteService, useValue: instService },
                { provide: AppConfigService, useValue: configService },
                { provide: AliasLookupService, useValue: aliasLookupService },
            ],
        }).compile();

        service = module.get<AuthorService>(AuthorService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('saves authors with two repository calls for institute mapping', async () => {
        const authorData = [{ id: 1, first_name: 'Alice', institutes: [{ id: 5 }] } as unknown as Author];
        const savedAuthor = { ...authorData[0], institutes: undefined } as Author;

        repository.save
            .mockResolvedValueOnce(savedAuthor)
            .mockResolvedValueOnce(authorData[0]);

        const result = await service.save(authorData);

        expect(repository.save).toHaveBeenNthCalledWith(1, expect.objectContaining({
            id: 1,
            first_name: 'Alice',
            institutes: undefined,
        }));
        expect(repository.save).toHaveBeenNthCalledWith(2, {
            id: 1,
            institutes: authorData[0].institutes,
        });
        expect(result).toEqual(authorData);
    });

    it('identifies authors via aliases', async () => {
        const targetAuthor = { id: 3, first_name: 'Jane', last_name: 'Doe', institutes: [] } as Author;

        aliasLookupService.findAliases
            .mockResolvedValueOnce([{ elementId: 3 }])
            .mockResolvedValueOnce([{ elementId: 3 }]);
        repository.findOne.mockResolvedValue(targetAuthor);

        const result = await service.identifyAuthor('Doe', 'Jane');

        expect(aliasLookupService.findAliases).toHaveBeenCalledWith(aliasLastNameRepository, 'Doe');
        expect(aliasLookupService.findAliases).toHaveBeenCalledWith(aliasFirstNameRepository, 'Jane');
        expect(repository.findOne).toHaveBeenCalledWith({
            where: { id: 3 },
            relations: { institutes: true },
        });
        expect(result).toBe(targetAuthor);
    });

    it('enriches existing authors when ORCID or affiliation is provided', async () => {
        const existingAuthor = { id: 7, first_name: 'John', last_name: 'Smith', institutes: [], orcid: null } as Author;
        const enrichedAuthor = { ...existingAuthor, orcid: '0000-0001', institutes: [{ id: 9, label: 'Institute' }] } as Author;

        repository.findOne
            .mockResolvedValueOnce(null);
        repository.find.mockResolvedValue([existingAuthor]);
        repository.save.mockResolvedValue(enrichedAuthor);
        aliasLookupService.findAliases.mockResolvedValue([]);
        instService.findOrSave.mockReturnValue(of({ id: 9, label: 'Institute' }));

        const result = await service.findOrSave('Smith', 'John', '0000-0001', 'Institute');

        expect(repository.find).toHaveBeenCalledWith({
            where: { last_name: expect.anything(), first_name: expect.anything() },
            relations: { institutes: true },
        });
        expect(instService.findOrSave).toHaveBeenCalledWith('Institute');
        expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
            id: 7,
            orcid: '0000-0001',
            institutes: [expect.objectContaining({ id: 9 })],
        }));
        expect(result).toEqual({ author: enrichedAuthor, error: null });
    });

    it('merges duplicate author attributes when combining records', async () => {
        const { mergeEntities: actualMergeEntities } = jest.requireActual('../common/merge');
        mergeEntitiesMock.mockImplementation((options) => actualMergeEntities(options));

        const primaryAuthor = {
            id: 1,
            first_name: 'Alice',
            last_name: 'Smith',
            orcid: '0000-1111',
            gnd_id: null,
            institutes: [{ id: 11 }],
            aliases_first_name: [{ elementId: 1, alias: 'Ally' }],
            aliases_last_name: [],
        } as unknown as Author;

        const duplicateAuthor = {
            id: 2,
            first_name: 'Alice',
            last_name: 'Smith',
            orcid: null,
            gnd_id: 'gnd-2',
            institutes: [{ id: 22 }],
            aliases_first_name: [{ elementId: 2, alias: 'Alicia' }],
            aliases_last_name: [{ elementId: 2, alias: 'Smyth' }],
        } as unknown as Author;

        repository.findOne.mockImplementation(async (options: any) => {
            const id = options?.where?.id;
            if (id === primaryAuthor.id) {
                return JSON.parse(JSON.stringify(primaryAuthor));
            }
            if (id === duplicateAuthor.id) {
                return JSON.parse(JSON.stringify(duplicateAuthor));
            }
            return null;
        });

        let savedAuthor: Author = null;
        repository.save.mockImplementation(async (entity: Author) => {
            savedAuthor = entity;
            return savedAuthor;
        });

        aliasFirstNameRepository.delete.mockResolvedValue({ affected: 1 } as any);
        aliasLastNameRepository.delete.mockResolvedValue({ affected: 1 } as any);
        pubAutRepository.delete.mockResolvedValue({ affected: 1 } as any);
        repository.delete.mockResolvedValue({ affected: 2 } as any);

        const result = await service.combineAuthors(1, [2], ['MergedFirst'], ['MergedLast']);

        expect(savedAuthor).not.toBeNull();
        expect(savedAuthor.gnd_id).toBe('gnd-2');
        expect(savedAuthor.orcid).toBe('0000-1111');
        expect(savedAuthor.institutes).toEqual([
            expect.objectContaining({ id: 11 }),
            expect.objectContaining({ id: 22 }),
        ]);
        expect(savedAuthor.aliases_first_name).toEqual(expect.arrayContaining([
            expect.objectContaining({ elementId: 1, alias: 'Ally' }),
            expect.objectContaining({ elementId: 2, alias: 'Alicia' }),
            expect.objectContaining({ elementId: 1, alias: 'MergedFirst' }),
        ]));
        expect(savedAuthor.aliases_last_name).toEqual(expect.arrayContaining([
            expect.objectContaining({ elementId: 2, alias: 'Smyth' }),
            expect.objectContaining({ elementId: 1, alias: 'MergedLast' }),
        ]));
        expect(result).toBe(savedAuthor);
    });

    it('combines authors and removes duplicates from repositories', async () => {
        mergeEntitiesMock.mockImplementation(async (options) => {
            if (options.afterSave) {
                await options.afterSave({
                    saved: { id: options.primaryId } as Author,
                    duplicates: [],
                    accumulator: {} as Author,
                    duplicateIds: options.duplicateIds,
                    defaultDelete: async () => {
                        await options.repository.delete?.(options.duplicateIds);
                    },
                });
            }
            return { id: options.primaryId } as Author;
        });

        aliasFirstNameRepository.delete.mockResolvedValue({affected: 1, raw: 1});

        const result = await service.combineAuthors(1, [2, 3], ['Al'], ['La']);

        expect(mergeEntitiesMock).toHaveBeenCalledWith(expect.objectContaining({
            repository,
            primaryId: 1,
            duplicateIds: [2, 3],
            mergeContext: expect.objectContaining({
                pubAutrepository: pubAutRepository,
                aliases_first_name: ['Al'],
                aliases_last_name: ['La'],
            }),
        }));

        expect(aliasFirstNameRepository.delete).toHaveBeenCalledWith({
            elementId: expect.objectContaining({ _type: 'in', _value: [2, 3] } as Partial<FindOperator<number>>),
        });
        expect(aliasLastNameRepository.delete).toHaveBeenCalledWith({
            elementId: expect.objectContaining({ _type: 'in', _value: [2, 3] } as Partial<FindOperator<number>>),
        });
        expect(pubAutRepository.delete).toHaveBeenCalledWith({
            authorId: expect.objectContaining({ _type: 'in', _value: [2, 3] } as Partial<FindOperator<number>>),
        });
        expect(repository.delete).toHaveBeenCalledWith([2, 3]);
        expect(result).toEqual({ id: 1 });
    });

    it('respects lock timeout logic when fetching a writer instance', async () => {
        const now = Date.now();
        const oldLock = new Date(now - 10 * 60 * 1000);
        const refreshedAuthor = { id: 4, locked_at: new Date(now - 60 * 1000) } as Author;
        const initialAuthor = { id: 4, locked_at: oldLock, institutes: [] } as Author;

        repository.findOne
            .mockResolvedValueOnce(initialAuthor)
            .mockResolvedValueOnce(refreshedAuthor);
        configService.get.mockResolvedValue(5);

        const saveSpy = jest.spyOn(service, 'save').mockResolvedValue([]);

        const result = await service.one(4, true);

        expect(configService.get).toHaveBeenCalledWith('lock_timeout');
        expect(saveSpy).toHaveBeenCalledWith([{ id: 4, locked_at: null }]);
        expect(repository.findOne).toHaveBeenCalledTimes(2);
        expect(result).toBe(refreshedAuthor);

        saveSpy.mockRestore();
    });
});
