import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PublicationService } from './publication.service';
import { Publication } from './Publication';
import { AuthorPublication } from '../relations/AuthorPublication';
import { Invoice } from '../../invoice/Invoice';
import { CostItem } from '../../invoice/CostItem';
import { PublicationIdentifier } from './PublicationIdentifier';
import { PublicationSupplement } from './PublicationSupplement';
import { PublicationDuplicate } from './PublicationDuplicate';
import { AppConfigService } from '../../config/app-config.service';
import { InstituteService } from '../../institute/institute.service';
describe('PublicationService combine', () => {
    let service: PublicationService;
    let pubRepository: jest.Mocked<Partial<Repository<Publication>>>;
    let pubAutRepository: jest.Mocked<Partial<Repository<AuthorPublication>>>;
    let invoiceRepository: jest.Mocked<Partial<Repository<Invoice>>>;
    let costItemRepository: jest.Mocked<Partial<Repository<CostItem>>>;
    let idRepository: jest.Mocked<Partial<Repository<PublicationIdentifier>>>;
    let supplRepository: jest.Mocked<Partial<Repository<PublicationSupplement>>>;
    let duplRepository: jest.Mocked<Partial<Repository<PublicationDuplicate>>>;
    beforeEach(async () => {
        pubRepository = {
            findOne: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
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
            save: jest.fn(),
        };
        supplRepository = {
            delete: jest.fn(),
        };
        duplRepository = {
            find: jest.fn(),
            delete: jest.fn(),
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
                { provide: AppConfigService, useValue: { get: jest.fn() } },
                { provide: InstituteService, useValue: { findOrSave: jest.fn() } },
            ],
        }).compile();

        service = module.get(PublicationService);
    });

    it('combines publications by preserving locked state and aggregating related records', async () => {
        const duplicateForward = [{ id: 501 } as PublicationDuplicate];
        const duplicateReverse = [{ id: 502 } as PublicationDuplicate];
        duplRepository.find
            .mockResolvedValueOnce(duplicateForward)
            .mockResolvedValueOnce(duplicateReverse);

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
        pubRepository.save.mockImplementation(async entity => entity as Publication);
        pubRepository.delete!.mockResolvedValue(undefined as never);
        pubAutRepository.delete!.mockResolvedValue(undefined as never);
        pubAutRepository.save!.mockResolvedValue(undefined as never);
        invoiceRepository.delete!.mockResolvedValue(undefined as never);
        supplRepository.delete!.mockResolvedValue(undefined as never);
        duplRepository.delete!.mockResolvedValue(undefined as never);

        const combined = await service.combine(61, [62, 63], ['alias-a']);

        expect(duplRepository.find).toHaveBeenCalledTimes(2);
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
        expect(pubAutRepository.delete).toHaveBeenCalledWith({ publicationId: expect.anything() });
        expect(invoiceRepository.delete).toHaveBeenCalledWith({ publication: { id: expect.anything() } });
        expect(supplRepository.delete).toHaveBeenCalledWith({ publication: { id: expect.anything() } });
        expect(duplRepository.delete).toHaveBeenCalledWith([501, 502]);
        expect(pubRepository.delete).toHaveBeenCalledWith([62, 63]);
    });
});
