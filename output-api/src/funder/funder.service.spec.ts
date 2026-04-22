import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { FunderService } from './funder.service';
import { Funder } from './Funder.entity';
import { AliasFunder } from './AliasFunder.entity';
import { PublicationService } from '../publication/core/publication.service';
import { AliasLookupService } from '../common/alias-lookup.service';
import { AppConfigService } from '../config/app-config.service';
describe('FunderService', () => {
    let service: FunderService;
    let repository: jest.Mocked<Partial<Repository<Funder>>>;
    let aliasRepository: jest.Mocked<Partial<Repository<AliasFunder>>>;
    let publicationService: { save: jest.Mock };
    let dataSource: { transaction: jest.Mock };

    beforeEach(async () => {
        repository = {
            findOne: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
        };
        aliasRepository = {
            delete: jest.fn(),
            save: jest.fn(),
        };
        publicationService = {
            save: jest.fn(),
        };
        dataSource = {
            transaction: jest.fn().mockImplementation(async (cb) => {
                const manager = {
                    save: repository.save,
                    delete: repository.delete,
                    getRepository: jest.fn().mockImplementation((entity) => {
                        if (entity === AliasFunder) return aliasRepository;
                        if (entity === Funder) return repository;
                        return repository;
                    }),
                    findOne: repository.findOne,
                };
                return cb(manager);
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FunderService,
                { provide: getRepositoryToken(Funder), useValue: repository },
                { provide: getRepositoryToken(AliasFunder), useValue: aliasRepository },
                { provide: PublicationService, useValue: publicationService },
                { provide: AliasLookupService, useValue: { findCanonicalElement: jest.fn() } },
                { provide: AppConfigService, useValue: { get: jest.fn() } },
                { provide: DataSource, useValue: dataSource },
            ],
        }).compile();

        service = module.get(FunderService);
    });

    it('saves aliases after the funder id is known', async () => {
        repository.save.mockResolvedValue({ id: 21, label: 'Funder' } as Funder);
        aliasRepository.delete!.mockResolvedValue(undefined as never);
        (aliasRepository.save as jest.Mock).mockImplementation(async (entities) => entities);

        const result = await service.save({
            label: 'Funder',
            aliases: [{ alias: 'Funder Alias' } as AliasFunder],
        });

        expect(repository.save).toHaveBeenCalledWith({ label: 'Funder' });
        expect(aliasRepository.delete).toHaveBeenCalledWith({ elementId: 21 });
        expect(aliasRepository.save).toHaveBeenCalledWith([
            expect.objectContaining({
                alias: 'Funder Alias',
                elementId: 21,
                element: expect.objectContaining({ id: 21 }),
            }),
        ]);
        expect(result.aliases).toEqual(expect.arrayContaining([
            expect.objectContaining({ alias: 'Funder Alias', elementId: 21 }),
        ]));
    });

    it('combines funders by aggregating aliases and reassigning funding relationships', async () => {
        const primary: Funder = {
            id: 21,
            label: 'Primary Funder',
            doi: null,
            aliases: [{ id: 1, alias: 'primary', elementId: 21 } as any],
            publications: [{ id: 40 }] as any,
        } as Funder;
        const duplicate: Funder = {
            id: 22,
            label: 'Duplicate Funder',
            doi: '10.1234/dup',
            aliases: [{ id: 2, alias: 'dup', elementId: 22 } as any],
            publications: [{
                id: 41,
                funders: [
                    { id: 22, label: 'Duplicate Funder' },
                    { id: 99, label: 'Other' },
                ],
            }] as any,
        } as Funder;

        const byId = new Map<number, Funder>([
            [primary.id, primary],
            [duplicate.id, duplicate],
        ]);

        repository.findOne.mockImplementation(async ({ where }: any) => byId.get(where.id));
        repository.save.mockImplementation(async entity => entity as Funder);
        repository.delete!.mockResolvedValue(undefined as never);
        aliasRepository.delete!.mockResolvedValue(undefined as never);
        publicationService.save.mockResolvedValue(undefined);

        const combined = await service.combine(21, [22], ['new-alias']);

        expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
            id: 21,
            label: 'Primary Funder',
            doi: '10.1234/dup',
            aliases: expect.arrayContaining([
                expect.objectContaining({ alias: 'primary' }),
                expect.objectContaining({ alias: 'dup' }),
                expect.objectContaining({ alias: 'new-alias', elementId: 21 }),
            ]),
        }));
        expect(combined).toEqual(expect.objectContaining({ doi: '10.1234/dup' }));
        expect(publicationService.save).toHaveBeenCalledWith([
            expect.objectContaining({
                id: 41,
                funders: expect.arrayContaining([
                    expect.objectContaining({ id: 21 }),
                    expect.objectContaining({ id: 99 }),
                ]),
            }),
        ], expect.anything());
        expect(aliasRepository.delete).toHaveBeenCalled();
        expect(repository.delete).toHaveBeenCalledWith([22]);
    });

    it('deletes aliases before deleting funders', async () => {
        repository.findOne.mockResolvedValue({
            id: 21,
            label: 'Funder',
            publications: [],
        } as Funder);
        publicationService.save.mockResolvedValue(undefined);
        aliasRepository.delete!.mockResolvedValue(undefined as never);
        repository.delete!.mockResolvedValue(undefined as never);

        await service.delete([{ id: 21 } as Funder]);

        expect(aliasRepository.delete).toHaveBeenCalledWith({
            elementId: expect.objectContaining({ _type: 'in', _value: [21] }),
        });
        expect(repository.delete).toHaveBeenCalledWith([21]);
        expect(aliasRepository.delete.mock.invocationCallOrder[0]).toBeLessThan(repository.delete.mock.invocationCallOrder[0]);
    });
});
