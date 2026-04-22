import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { CompareOperation, JoinOperation, SearchFilter } from '../../../../output-interfaces/Config';
import { ApiErrorCode } from '../../../../output-interfaces/ApiError';
import { PublicationService } from './publication.service';
import { Publication } from './Publication.entity';
import { AuthorPublication } from '../relations/AuthorPublication.entity';
import { Invoice } from '../../invoice/Invoice.entity';
import { CostItem } from '../../invoice/CostItem.entity';
import { PublicationIdentifier } from './PublicationIdentifier.entity';
import { PublicationSupplement } from './PublicationSupplement.entity';
import { PublicationDuplicate } from './PublicationDuplicate.entity';
import { AppConfigService } from '../../config/app-config.service';
import { EditLockOwnerStore } from '../../common/edit-lock';
import { InstituteService } from '../../institute/institute.service';
import { PublicationChangeService } from './publication-change.service';

const expectApiError = async (
    promise: Promise<unknown>,
    expected: {
        statusCode: number;
        code: ApiErrorCode;
        message?: string;
    },
) => {
    try {
        await promise;
        fail(`Expected promise to reject with ${expected.code}`);
    } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getResponse()).toMatchObject({
            statusCode: expected.statusCode,
            code: expected.code,
            ...(expected.message ? { message: expected.message } : {}),
        });
    }
};

describe('PublicationService combine', () => {
    let service: PublicationService;
    let pubRepository: jest.Mocked<Partial<Repository<Publication>>>;
    let pubAutRepository: jest.Mocked<Partial<Repository<AuthorPublication>>>;
    let invoiceRepository: jest.Mocked<Partial<Repository<Invoice>>>;
    let costItemRepository: jest.Mocked<Partial<Repository<CostItem>>>;
    let idRepository: jest.Mocked<Partial<Repository<PublicationIdentifier>>>;
    let supplRepository: jest.Mocked<Partial<Repository<PublicationSupplement>>>;
    let duplRepository: jest.Mocked<Partial<Repository<PublicationDuplicate>>>;
    let publicationChangeService: {
        createPublicationChange: jest.Mock;
        deletePublicationChangesForPublications: jest.Mock;
    };
    let configService: { get: jest.Mock };

    beforeEach(async () => {
        EditLockOwnerStore.clear();
        pubRepository = {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            softDelete: jest.fn(),
        };
        pubAutRepository = {
            delete: jest.fn(),
            save: jest.fn(),
        };
        invoiceRepository = {
            delete: jest.fn(),
        };
        costItemRepository = {
            delete: jest.fn(),
        };
        idRepository = {
            delete: jest.fn(),
            save: jest.fn(),
        };
        supplRepository = {
            delete: jest.fn(),
            save: jest.fn(),
        };
        duplRepository = {
            find: jest.fn(),
            delete: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
        };
        publicationChangeService = {
            createPublicationChange: jest.fn(),
            deletePublicationChangesForPublications: jest.fn(),
        };
        configService = {
            get: jest.fn(async () => 5),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PublicationService,
                { provide: getRepositoryToken(Publication), useValue: pubRepository },
                { provide: getRepositoryToken(AuthorPublication), useValue: pubAutRepository },
                { provide: getRepositoryToken(Invoice), useValue: invoiceRepository },
                { provide: getRepositoryToken(CostItem), useValue: costItemRepository },
                { provide: getRepositoryToken(PublicationIdentifier), useValue: idRepository },
                { provide: getRepositoryToken(PublicationSupplement), useValue: supplRepository },
                { provide: getRepositoryToken(PublicationDuplicate), useValue: duplRepository },
                { provide: AppConfigService, useValue: configService },
                { provide: InstituteService, useValue: { findOrSave: jest.fn() } },
                { provide: PublicationChangeService, useValue: publicationChangeService },
            ],
        }).compile();

        service = module.get(PublicationService);
    });

    it('combines publications by preserving locked state and aggregating related records', async () => {
        const primary: Publication = {
            id: 61,
            locked: false,
            title: 'Primary Publication',
            doi: '10.primary/doi',
            greater_entity: null,
            funders: [{ id: 201 } as any],
            identifiers: [{ id: 1, value: 'ID-1', type: 'doi', entity: { id: 61 } }] as any,
            supplements: [{ id: 701 }] as any,
            authorPublications: [{ id: 801, institute: { id: 10 } }] as any,
        } as Publication;
        const duplicateA: Publication = {
            id: 62,
            locked: false,
            title: 'Duplicate A',
            doi: null,
            greater_entity: { id: 300, label: 'GE' } as any,
            funders: [{ id: 202 } as any],
            identifiers: [{ id: 2, value: 'ID-2', type: 'isbn', entity: { id: 62 } }] as any,
            supplements: [{ id: 702 }] as any,
            authorPublications: [{ id: 802, institute: { id: 12 } }] as any,
        } as Publication;
        const duplicateB: Publication = {
            id: 63,
            locked: false,
            title: 'Duplicate B',
            doi: '10.duplicate/doi',
            greater_entity: null,
            funders: [{ id: 203 } as any],
            identifiers: [],
            supplements: [],
            authorPublications: [],
        } as Publication;

        const byId = new Map<number, Publication>([
            [primary.id, primary],
            [duplicateA.id, duplicateA],
            [duplicateB.id, duplicateB],
        ]);

        pubRepository.findOne.mockImplementation(async ({ where }: any) => byId.get(where.id));
        pubRepository.find.mockResolvedValue([
            { id: 62, invoices: [{ id: 901, cost_items: [{ id: 801 } as CostItem] } as Invoice] } as Publication,
            { id: 63, invoices: [] } as Publication,
        ]);
        pubRepository.save.mockImplementation(async entity => entity as Publication);
        pubRepository.delete!.mockResolvedValue(undefined as never);
        pubAutRepository.delete!.mockResolvedValue(undefined as never);
        pubAutRepository.save!.mockResolvedValue(undefined as never);
        invoiceRepository.delete!.mockResolvedValue(undefined as never);
        costItemRepository.delete!.mockResolvedValue(undefined as never);
        idRepository.delete!.mockResolvedValue(undefined as never);
        supplRepository.delete!.mockResolvedValue(undefined as never);
        duplRepository.delete!.mockResolvedValue(undefined as never);

        const combined = await service.combine(61, [62, 63], ['alias-a']);

        expect(pubRepository.save).toHaveBeenCalledWith(expect.objectContaining({
            id: 61,
            doi: '10.primary/doi',
            greater_entity: expect.objectContaining({ id: 300 }),
            funders: expect.arrayContaining([
                expect.objectContaining({ id: 201 }),
                expect.objectContaining({ id: 202 }),
                expect.objectContaining({ id: 203 }),
            ]),
            identifiers: expect.arrayContaining([
                expect.objectContaining({ value: 'ID-1' }),
                expect.objectContaining({ value: 'ID-2' }),
            ]),
            supplements: expect.arrayContaining([
                expect.objectContaining({ id: 701 }),
                expect.objectContaining({ id: 702 }),
            ]),
        }));
        expect(combined).toEqual(expect.objectContaining({
            id: 61,
            greater_entity: expect.objectContaining({ id: 300 }),
            funders: expect.arrayContaining([
                expect.objectContaining({ id: 201 }),
                expect.objectContaining({ id: 202 }),
                expect.objectContaining({ id: 203 }),
            ]),
        }));
        expect(pubAutRepository.save).toHaveBeenCalledWith({
            id: 802,
            publication: expect.objectContaining({ id: 61 }),
        });
        expect(pubAutRepository.delete).toHaveBeenCalledWith({ publicationId: In([62, 63]) });
        expect(costItemRepository.delete).toHaveBeenCalledWith([801]);
        expect(invoiceRepository.delete).toHaveBeenCalledWith([901]);
        expect(idRepository.delete).toHaveBeenCalledWith({ entity: { id: In([62, 63]) } });
        expect(supplRepository.delete).toHaveBeenCalledWith({ publication: { id: In([62, 63]) } });
        expect(duplRepository.delete).toHaveBeenCalledWith({ id_first: In([62, 63]) });
        expect(duplRepository.delete).toHaveBeenCalledWith({ id_second: In([62, 63]) });
        expect(publicationChangeService.deletePublicationChangesForPublications).toHaveBeenCalledWith([62, 63]);
        expect(pubRepository.delete).toHaveBeenCalledWith([62, 63]);
    });

    it('returns a structured not-found error when the primary publication does not exist during combine', async () => {
        duplRepository.find.mockResolvedValue([]);
        pubRepository.findOne.mockResolvedValue(null);

        await expectApiError(service.combine(999, [62]), {
            statusCode: 404,
            code: ApiErrorCode.NOT_FOUND,
        });
        expect(pubRepository.save).not.toHaveBeenCalled();
        expect(pubRepository.delete).not.toHaveBeenCalled();
    });

    it('returns a structured not-found error when a duplicate publication does not exist during combine', async () => {
        duplRepository.find.mockResolvedValue([]);
        const primary = { id: 61, locked: false } as Publication;
        pubRepository.findOne.mockImplementation(async ({ where }: any) => where.id === 61 ? primary : null);

        await expectApiError(service.combine(61, [999]), {
            statusCode: 404,
            code: ApiErrorCode.NOT_FOUND,
        });
        expect(pubRepository.save).not.toHaveBeenCalled();
        expect(pubRepository.delete).not.toHaveBeenCalled();
    });

    it('returns a structured lock error when one of the publications is locked during combine', async () => {
        duplRepository.find.mockResolvedValue([]);
        const primary = { id: 61, locked: true } as Publication;
        const duplicate = { id: 62, locked: false } as Publication;
        pubRepository.findOne.mockImplementation(async ({ where }: any) => {
            if (where.id === 61) return primary;
            if (where.id === 62) return duplicate;
            return null;
        });

        await expectApiError(service.combine(61, [62]), {
            statusCode: 409,
            code: ApiErrorCode.ENTITY_LOCKED,
        });
        expect(pubRepository.save).not.toHaveBeenCalled();
        expect(pubRepository.delete).not.toHaveBeenCalled();
    });

    it('returns null when a requested publication id does not exist', async () => {
        pubRepository.findOne.mockResolvedValue(null);

        const result = await service.getPublication(999, false, true);

        expect(pubRepository.findOne).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 999 },
            withDeleted: true,
        }));
        expect(pubRepository.save).not.toHaveBeenCalled();
        expect(result).toBeNull();
    });

    it('wraps duplicate publication save errors in the shared API error format', async () => {
        pubRepository.save.mockRejectedValue({
            code: '23505',
            detail: 'Key (doi)=(10.1234/example) already exists.',
            constraint: 'uq_publication_doi',
        });

        try {
            await service.save([{ doi: '10.1234/example' } as Publication]);
            fail('service.save should throw for duplicate publication values');
        } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getResponse()).toMatchObject({
                statusCode: 409,
                code: ApiErrorCode.UNIQUE_CONSTRAINT,
                details: expect.arrayContaining([
                    expect.objectContaining({ path: 'doi', code: 'unique' }),
                ]),
            });
        }
    });

    it('saves new publication authorships after the publication id is known', async () => {
        (pubRepository.save as jest.Mock).mockImplementation(async (entities: Publication[]) =>
            entities.map((entity, index) => ({ ...entity, id: 90 + index }) as Publication),
        );
        pubAutRepository.delete!.mockResolvedValue(undefined as never);
        (pubAutRepository.save as jest.Mock).mockImplementation(async (entities) => entities as AuthorPublication[]);

        const result = await service.save([{
            title: 'Publication with author',
            authorPublications: [{
                author: { id: 876 } as any,
                affiliation: 'Center for Intervention and Research',
                corresponding: false,
            } as AuthorPublication],
        } as Publication]);

        const savedPublicationArg = pubRepository.save.mock.calls[0][0] as Publication[];
        expect(savedPublicationArg[0]).not.toHaveProperty('authorPublications');
        expect(pubAutRepository.delete).toHaveBeenCalledWith({ publicationId: 90 });
        expect(pubAutRepository.save).toHaveBeenCalledWith([
            expect.objectContaining({
                authorId: 876,
                publicationId: 90,
                publication: expect.objectContaining({ id: 90 }),
                affiliation: 'Center for Intervention and Research',
                corresponding: false,
            }),
        ]);
        expect(result[0].authorPublications).toEqual(expect.arrayContaining([
            expect.objectContaining({ authorId: 876, publicationId: 90 }),
        ]));
    });

    it('saves identifiers and supplements after the publication id is known', async () => {
        (pubRepository.save as jest.Mock).mockImplementation(async (entities: Publication[]) =>
            entities.map((entity, index) => ({ ...entity, id: 90 + index }) as Publication),
        );
        idRepository.delete!.mockResolvedValue(undefined as never);
        (idRepository.save as jest.Mock).mockImplementation(async (entities) => entities as PublicationIdentifier[]);
        supplRepository.delete!.mockResolvedValue(undefined as never);
        (supplRepository.save as jest.Mock).mockImplementation(async (entities) => entities as PublicationSupplement[]);

        const result = await service.save([{
            title: 'Publication with owned relations',
            identifiers: [{ type: 'DOI', value: '10.1234/example' } as PublicationIdentifier],
            supplements: [{ link: 'https://example.test/supplement.pdf' } as PublicationSupplement],
        } as Publication]);

        const savedPublicationArg = pubRepository.save.mock.calls[0][0] as Publication[];
        expect(savedPublicationArg[0]).not.toHaveProperty('identifiers');
        expect(savedPublicationArg[0]).not.toHaveProperty('supplements');
        expect(idRepository.delete).toHaveBeenCalledWith({ entity: { id: 90 } });
        expect(idRepository.save).toHaveBeenCalledWith([
            expect.objectContaining({
                type: 'doi',
                value: '10.1234/EXAMPLE',
                entity: expect.objectContaining({ id: 90 }),
            }),
        ]);
        expect(supplRepository.delete).toHaveBeenCalledWith({ publication: { id: 90 } });
        expect(supplRepository.save).toHaveBeenCalledWith([
            expect.objectContaining({
                link: 'https://example.test/supplement.pdf',
                publication: expect.objectContaining({ id: 90 }),
            }),
        ]);
        expect(result[0].identifiers).toEqual(expect.arrayContaining([
            expect.objectContaining({ type: 'doi', value: '10.1234/EXAMPLE' }),
        ]));
        expect(result[0].supplements).toEqual(expect.arrayContaining([
            expect.objectContaining({ link: 'https://example.test/supplement.pdf' }),
        ]));
    });

    it('updates authorships without cascading rows with a null publication id', async () => {
        pubRepository.find.mockResolvedValue([{ id: 7, locked_at: null } as Publication] as never);
        pubRepository.save.mockResolvedValue({ id: 7, title: 'Updated' } as never);
        pubAutRepository.delete!.mockResolvedValue(undefined as never);
        (pubAutRepository.save as jest.Mock).mockImplementation(async (entities) => entities as AuthorPublication[]);

        await service.update([{
            id: 7,
            title: 'Updated',
            authorPublications: [{
                author: { id: 876 } as any,
                affiliation: 'Center for Intervention and Research',
                corresponding: false,
            } as AuthorPublication],
        } as Publication]);

        const savedPublicationArg = pubRepository.save.mock.calls[0][0] as Publication;
        expect(savedPublicationArg).not.toHaveProperty('authorPublications');
        expect(pubAutRepository.delete).toHaveBeenCalledWith({ publicationId: 7 });
        expect(pubAutRepository.save).toHaveBeenCalledWith([
            expect.objectContaining({
                authorId: 876,
                publicationId: 7,
                publication: expect.objectContaining({ id: 7 }),
            }),
        ]);
    });

    it('updates identifiers and supplements without cascading rows with a null publication id', async () => {
        pubRepository.find.mockResolvedValue([{ id: 7, locked_at: null } as Publication] as never);
        pubRepository.save.mockResolvedValue({ id: 7, title: 'Updated' } as never);
        idRepository.delete!.mockResolvedValue(undefined as never);
        (idRepository.save as jest.Mock).mockImplementation(async (entities) => entities as PublicationIdentifier[]);
        supplRepository.delete!.mockResolvedValue(undefined as never);
        (supplRepository.save as jest.Mock).mockImplementation(async (entities) => entities as PublicationSupplement[]);

        await service.update([{
            id: 7,
            title: 'Updated',
            identifiers: [{ type: 'ISBN', value: 'abc-123' } as PublicationIdentifier],
            supplements: [{ link: 'https://example.test/supplement.pdf' } as PublicationSupplement],
        } as Publication]);

        const savedPublicationArg = pubRepository.save.mock.calls[0][0] as Publication;
        expect(savedPublicationArg).not.toHaveProperty('identifiers');
        expect(savedPublicationArg).not.toHaveProperty('supplements');
        expect(idRepository.delete).toHaveBeenCalledWith({ entity: { id: 7 } });
        expect(idRepository.save).toHaveBeenCalledWith([
            expect.objectContaining({
                type: 'isbn',
                value: 'ABC-123',
                entity: expect.objectContaining({ id: 7 }),
            }),
        ]);
        expect(supplRepository.delete).toHaveBeenCalledWith({ publication: { id: 7 } });
        expect(supplRepository.save).toHaveBeenCalledWith([
            expect.objectContaining({
                link: 'https://example.test/supplement.pdf',
                publication: expect.objectContaining({ id: 7 }),
            }),
        ]);
    });

    it('keeps a locked publication editable for the same user', async () => {
        const lockedAt = new Date();

        pubRepository.findOne
            .mockResolvedValueOnce({ id: 41, locked_at: null } as Publication)
            .mockResolvedValueOnce({ id: 41, locked_at: lockedAt } as Publication);
        pubRepository.update!.mockResolvedValue({ affected: 1 } as never);

        const first = await service.getPublication(41, false, true, 'alice');
        const second = await service.getPublication(41, false, true, 'alice');

        expect(pubRepository.update).toHaveBeenCalledWith(
            expect.objectContaining({ id: 41, locked_at: expect.any(Object) }),
            expect.objectContaining({ locked_at: expect.any(Date) }),
        );
        expect(first?.locked_at).toBeUndefined();
        expect(second?.locked_at).toBeUndefined();
    });

    it('rejects saving a publication locked by another user', async () => {
        const lockedAt = new Date();

        pubRepository.findOne.mockResolvedValueOnce({ id: 42, locked_at: null } as Publication);
        pubRepository.update!.mockResolvedValue({ affected: 1 } as never);

        await service.getPublication(42, false, true, 'alice');

        pubRepository.find.mockResolvedValue([{ id: 42, locked_at: lockedAt } as Publication] as never);

        try {
            await service.save([{ id: 42, title: 'Blocked' } as Publication], { by_user: 'mallory' });
            fail('service.save should reject publication updates while locked by another user');
        } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getResponse()).toMatchObject({
                statusCode: 409,
                code: ApiErrorCode.ENTITY_LOCKED,
            });
        }
        expect(pubRepository.save).not.toHaveBeenCalled();
    });

    it('rejects saving a publication with id 0 when that record is locked by another user', async () => {
        EditLockOwnerStore.setOwner('publication', 0, 'alice');
        pubRepository.find.mockResolvedValue([{ id: 0, locked_at: new Date() } as Publication] as never);

        try {
            await service.save([{ id: 0, title: 'Blocked zero' } as Publication], { by_user: 'mallory' });
            fail('service.save should reject publication id 0 updates while locked by another user');
        } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getResponse()).toMatchObject({
                statusCode: 409,
                code: ApiErrorCode.ENTITY_LOCKED,
            });
        }
        expect(pubRepository.save).not.toHaveBeenCalled();
    });

    it('allows the lock owner to release an active publication lock', async () => {
        const lockedAt = new Date();

        pubRepository.findOne
            .mockResolvedValueOnce({ id: 43, locked_at: null } as Publication)
            .mockResolvedValueOnce({ id: 43, locked_at: lockedAt, identifiers: [], supplements: [] } as Publication);
        pubRepository.update!.mockResolvedValue({ affected: 1 } as never);
        pubRepository.find.mockResolvedValue([{ id: 43, locked_at: lockedAt } as Publication] as never);
        pubRepository.save.mockResolvedValue({ id: 43, locked_at: null } as never);

        await service.getPublication(43, false, true, 'alice');

        await expect(service.update([{ id: 43, locked_at: null } as Publication], { by_user: 'alice' }))
            .resolves.toBe(1);
        expect(pubRepository.save).toHaveBeenCalledWith(expect.objectContaining({ id: 43, locked_at: null }));
    });

    it('checks DOI or title existence using case-insensitive matching', async () => {
        pubRepository.findOne.mockResolvedValue({ id: 42 } as Publication);

        const exists = await service.checkDOIorTitleAlreadyExists('10.1234/doi', 'Some Title');

        expect(pubRepository.findOne).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.arrayContaining([
                expect.objectContaining({ doi: expect.anything() }),
                expect.objectContaining({ title: expect.anything() }),
            ]),
            withDeleted: true,
        }));
        expect(exists).toBe(true);
    });

    it('returns matched publication with relations when searching by DOI or title', async () => {
        const matchedPub = { id: 11, title: 'Trimmed Title', doi: '10.5678/abc' } as Publication;
        pubRepository.findOne.mockResolvedValue(matchedPub);

        const result = await service.getPubwithDOIorTitle(' 10.5678/abc ', ' Trimmed Title ');

        expect(pubRepository.findOne).toHaveBeenCalledWith(expect.objectContaining({
            withDeleted: true,
            relations: expect.objectContaining({
                pub_type: true,
                greater_entity: true,
                publisher: true,
                oa_category: true,
                contract: true,
                funders: true,
                invoices: expect.objectContaining({ cost_items: expect.objectContaining({ cost_type: true }) }),
            }),
        }));
        expect(result).toBe(matchedPub);
    });

    describe('saveDuplicate', () => {
        it('saves a new duplicate pair when none exists', async () => {
            duplRepository.findOne!.mockResolvedValue(null);
            const saved = { id: 77, id_first: 1, id_second: 2 } as PublicationDuplicate;
            duplRepository.save!.mockResolvedValue(saved);

            const result = await service.saveDuplicate(1, 2, 'test');

            expect(duplRepository.findOne).toHaveBeenCalledWith({ where: { id_first: 1, id_second: 2 }, withDeleted: true });
            expect(duplRepository.save).toHaveBeenCalledWith({ id_first: 1, id_second: 2, description: 'test' });
            expect(result).toEqual(saved);
        });

        it('returns null without saving when duplicate pair already exists', async () => {
            duplRepository.findOne!.mockResolvedValue({ id: 88 } as PublicationDuplicate);

            const result = await service.saveDuplicate(3, 4);

            expect(duplRepository.findOne).toHaveBeenCalledWith({ where: { id_first: 3, id_second: 4 }, withDeleted: true });
            expect(duplRepository.save).not.toHaveBeenCalled();
            expect(result).toBeNull();
        });
    });

    it('logs change patches from reloaded entities instead of partial save payloads', async () => {
        const before = {
            id: 7,
            title: 'Before',
            pub_type: { id: 11, label: 'Journal' },
            identifiers: [],
            supplements: [],
        } as Publication;
        const after = {
            id: 7,
            title: 'After',
            pub_type: { id: 11, label: 'Journal' },
            identifiers: [],
            supplements: [],
        } as Publication;

        pubRepository.find
            .mockResolvedValueOnce([{ id: 7, locked_at: null } as Publication] as never)
            .mockResolvedValueOnce([before])
            .mockResolvedValueOnce([after]);
        pubRepository.save.mockResolvedValue([{ id: 7, title: 'After' } as Publication] as any);

        await service.save([{ id: 7, title: 'After' } as Publication], { by_user: 'scanner' } as any);

        expect(publicationChangeService.createPublicationChange).toHaveBeenCalledWith(expect.objectContaining({
            patch_data: expect.objectContaining({
                before: {
                    title: 'Before',
                },
                after: {
                    title: 'After',
                },
            }),
        }));
    });

    it('deletes publication changes before soft deleting publications', async () => {
        pubRepository.find.mockResolvedValue([{
            id: 7,
            invoices: [],
        } as unknown as Publication]);
        pubRepository.softDelete!.mockResolvedValue(undefined as never);

        await service.delete([{ id: 7 } as Publication], true);

        expect(publicationChangeService.deletePublicationChangesForPublications).toHaveBeenCalledWith([7]);
        expect(pubRepository.softDelete).toHaveBeenCalledWith([7]);
        expect(pubRepository.delete).not.toHaveBeenCalled();
    });

    it('deletes publication relation rows before hard deleting publications', async () => {
        pubRepository.find.mockResolvedValue([{
            id: 7,
            invoices: [{
                id: 11,
                cost_items: [{ id: 21 } as CostItem],
            } as Invoice],
        } as Publication]);
        pubRepository.delete!.mockResolvedValue(undefined as never);

        await service.delete([{ id: 7 } as Publication]);

        expect(pubAutRepository.delete).toHaveBeenCalledWith({ publicationId: In([7]) });
        expect(costItemRepository.delete).toHaveBeenCalledWith([21]);
        expect(invoiceRepository.delete).toHaveBeenCalledWith([11]);
        expect(idRepository.delete).toHaveBeenCalledWith({ entity: { id: In([7]) } });
        expect(supplRepository.delete).toHaveBeenCalledWith({ publication: { id: In([7]) } });
        expect(duplRepository.delete).toHaveBeenCalledWith({ id_first: In([7]) });
        expect(duplRepository.delete).toHaveBeenCalledWith({ id_second: In([7]) });
        expect(publicationChangeService.deletePublicationChangesForPublications).toHaveBeenCalledWith([7]);

        const parentDeleteOrder = pubRepository.delete.mock.invocationCallOrder[0];
        expect(pubAutRepository.delete.mock.invocationCallOrder[0]).toBeLessThan(parentDeleteOrder);
        expect(costItemRepository.delete.mock.invocationCallOrder[0]).toBeLessThan(parentDeleteOrder);
        expect(invoiceRepository.delete.mock.invocationCallOrder[0]).toBeLessThan(parentDeleteOrder);
        expect(idRepository.delete!.mock.invocationCallOrder[0]).toBeLessThan(parentDeleteOrder);
        expect(supplRepository.delete!.mock.invocationCallOrder[0]).toBeLessThan(parentDeleteOrder);
        expect(duplRepository.delete!.mock.invocationCallOrder[0]).toBeLessThan(parentDeleteOrder);
        expect(publicationChangeService.deletePublicationChangesForPublications.mock.invocationCallOrder[0]).toBeLessThan(parentDeleteOrder);
    });
});

describe('PublicationService filter', () => {
    let service: PublicationService;
    let instituteService: { findInstituteIdsIncludingSubInstitutes: jest.Mock };

    const createQueryBuilderMock = () => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
    });

    beforeEach(() => {
        instituteService = {
            findInstituteIdsIncludingSubInstitutes: jest.fn(),
        };

        service = new PublicationService(
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            instituteService as any,
            {} as any,
        );
        service.filter_joins = new Set();
    });

    it('binds string filter values as query parameters', async () => {
        const queryBuilder = createQueryBuilderMock();
        const filter: SearchFilter = {
            expressions: [{
                op: JoinOperation.AND,
                key: 'title',
                comp: CompareOperation.INCLUDES,
                value: `%' OR 1=1 --`,
            }]
        };

        await service.filter(filter, queryBuilder as any);

        expect(queryBuilder.where).toHaveBeenCalledWith(
            'publication.title ILIKE :filter_0',
            { filter_0: `%%' OR 1=1 --%` }
        );
    });

    it('expands institute filters and binds the resulting ids', async () => {
        const queryBuilder = createQueryBuilderMock();
        instituteService.findInstituteIdsIncludingSubInstitutes.mockResolvedValue([11, 12, 13]);
        const filter: SearchFilter = {
            expressions: [{
                op: JoinOperation.AND,
                key: 'institute_id',
                comp: CompareOperation.EQUALS,
                value: 11,
            }]
        };

        await service.filter(filter, queryBuilder as any);

        expect(instituteService.findInstituteIdsIncludingSubInstitutes).toHaveBeenCalledWith([11]);
        expect(queryBuilder.where).toHaveBeenCalledWith(
            'EXISTS (SELECT 1 FROM author_publication ap WHERE ap."publicationId" = publication.id AND ap."instituteId" IN (:...filter_0))',
            { filter_0: [11, 12, 13] }
        );
    });

    it('filters author membership via EXISTS so joined metadata rows stay intact', async () => {
        const queryBuilder = createQueryBuilderMock();
        const filter: SearchFilter = {
            expressions: [{
                op: JoinOperation.AND,
                key: 'author_id',
                comp: CompareOperation.EQUALS,
                value: 42,
            }]
        };

        await service.filter(filter, queryBuilder as any);

        expect(queryBuilder.where).toHaveBeenCalledWith(
            'EXISTS (SELECT 1 FROM author_publication ap WHERE ap."publicationId" = publication.id AND ap."authorId" = :filter_0)',
            { filter_0: 42 }
        );
    });

    it('filters institutional author names via EXISTS without relying on outer author joins', async () => {
        const queryBuilder = createQueryBuilderMock();
        const filter: SearchFilter = {
            expressions: [{
                op: JoinOperation.AND,
                key: 'inst_authors',
                comp: CompareOperation.INCLUDES,
                value: 'Miller',
            }]
        };

        await service.filter(filter, queryBuilder as any);

        expect(queryBuilder.where).toHaveBeenCalledWith(
            `EXISTS (SELECT 1 FROM author_publication ap INNER JOIN author author_filter ON author_filter.id = ap."authorId" WHERE ap."publicationId" = publication.id AND concat(author_filter.last_name, ', ' ,author_filter.first_name) ILIKE :filter_0)`,
            { filter_0: '%Miller%' }
        );
        expect(queryBuilder.leftJoin).not.toHaveBeenCalled();
    });

    it('filters institute names via EXISTS without shrinking joined institute metadata', async () => {
        const queryBuilder = createQueryBuilderMock();
        const filter: SearchFilter = {
            expressions: [{
                op: JoinOperation.AND,
                key: 'institute',
                comp: CompareOperation.STARTS_WITH,
                value: 'Central',
            }]
        };

        await service.filter(filter, queryBuilder as any);

        expect(queryBuilder.where).toHaveBeenCalledWith(
            'EXISTS (SELECT 1 FROM author_publication ap INNER JOIN institute institute_filter ON institute_filter.id = ap."instituteId" WHERE ap."publicationId" = publication.id AND institute_filter.label ILIKE :filter_0)',
            { filter_0: 'Central%' }
        );
        expect(queryBuilder.leftJoin).not.toHaveBeenCalled();
    });

    it('rejects unsupported filter keys instead of passing them into SQL', async () => {
        const queryBuilder = createQueryBuilderMock();
        const filter: SearchFilter = {
            expressions: [{
                op: JoinOperation.AND,
                key: 'title) OR 1=1 --',
                comp: CompareOperation.EQUALS,
                value: 'anything',
            }]
        };

        try {
            await service.filter(filter, queryBuilder as any);
            fail('service.filter should reject unsupported filter keys');
        } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getResponse()).toMatchObject({
                statusCode: 400,
                code: ApiErrorCode.INVALID_REQUEST,
            });
        }
        expect(queryBuilder.where).not.toHaveBeenCalled();
    });

    it('adds relation joins for publisher and invoice year filters', async () => {
        const queryBuilder = createQueryBuilderMock();
        const filter: SearchFilter = {
            expressions: [
                {
                    op: JoinOperation.AND,
                    key: 'publisher',
                    comp: CompareOperation.EQUALS,
                    value: 'Test Publisher',
                },
                {
                    op: JoinOperation.AND,
                    key: 'invoice_year',
                    comp: CompareOperation.EQUALS,
                    value: 2024,
                }
            ]
        };

        await service.filter(filter, queryBuilder as any);

        expect(queryBuilder.where).toHaveBeenCalledWith(
            'publisher.label = :filter_0',
            { filter_0: 'Test Publisher' }
        );
        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
            'invoice.date > :filter_1_beginDate AND invoice.date < :filter_1_endDate',
            {
                filter_1_beginDate: new Date(Date.UTC(2024, 0, 1, 0, 0, 0, 0)),
                filter_1_endDate: new Date(Date.UTC(2024, 11, 31, 23, 59, 59, 999)),
            }
        );
        expect(queryBuilder.leftJoin).toHaveBeenCalledWith('publication.publisher', 'publisher');
        expect(queryBuilder.leftJoin).toHaveBeenCalledWith('publication.invoices', 'invoice');
    });

    it('uses the null-date fallback and negates filters for AND_NOT expressions', async () => {
        const queryBuilder = createQueryBuilderMock();
        const filter: SearchFilter = {
            expressions: [
                {
                    op: JoinOperation.AND,
                    key: 'pub_date',
                    comp: CompareOperation.EQUALS,
                    value: '',
                },
                {
                    op: JoinOperation.AND_NOT,
                    key: 'locked',
                    comp: CompareOperation.EQUALS,
                    value: true as any,
                }
            ]
        };

        await service.filter(filter, queryBuilder as any);

        expect(queryBuilder.where).toHaveBeenCalledWith(
            'publication.pub_date IS NULL AND publication.pub_date_print IS NULL AND publication.pub_date_accepted IS NULL AND publication.pub_date_submitted IS NULL',
            undefined
        );
        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
            'NOT (publication.locked = :filter_1)',
            { filter_1: true }
        );
    });

    it('uses OR for subsequent alternative filters', async () => {
        const queryBuilder = createQueryBuilderMock();
        const filter: SearchFilter = {
            expressions: [
                {
                    op: JoinOperation.AND,
                    key: 'title',
                    comp: CompareOperation.STARTS_WITH,
                    value: 'Alpha',
                },
                {
                    op: JoinOperation.OR,
                    key: 'doi',
                    comp: CompareOperation.EQUALS,
                    value: '10.1000/example',
                }
            ]
        };

        await service.filter(filter, queryBuilder as any);

        expect(queryBuilder.where).toHaveBeenCalledWith(
            'publication.title ILIKE :filter_0',
            { filter_0: 'Alpha%' }
        );
        expect(queryBuilder.orWhere).toHaveBeenCalledWith(
            'publication.doi = :filter_1',
            { filter_1: '10.1000/example' }
        );
    });
});
