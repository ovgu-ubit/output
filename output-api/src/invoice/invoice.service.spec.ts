import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ApiErrorCode } from '../../../output-interfaces/ApiError';
import { EditLockOwnerStore } from '../common/edit-lock';
import { AppConfigService } from '../config/app-config.service';
import { Publication } from '../publication/core/Publication.entity';
import { CostCenterService } from './cost-center.service';
import { CostTypeService } from './cost-type.service';
import { Invoice } from './Invoice.entity';
import { InvoiceService } from './invoice.service';

describe('InvoiceService', () => {
    let service: InvoiceService;
    let invoiceRepository: jest.Mocked<Partial<Repository<Invoice>>>;
    let publicationRepository: jest.Mocked<Partial<Repository<Publication>>>;
    let dataSource: { transaction: jest.Mock };

    beforeEach(async () => {
        EditLockOwnerStore.clear();
        invoiceRepository = {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
        };
        publicationRepository = {
            find: jest.fn(),
            update: jest.fn(),
        };
        dataSource = {
            transaction: jest.fn().mockImplementation(async (cb) => {
                const managerMock = {
                    save: jest.fn().mockImplementation(async (entity, obj) => {
                        if (entity && obj) {
                             if (entity === Invoice) return invoiceRepository.save(obj);
                             if (entity === Publication) return publicationRepository.save(obj);
                             return invoiceRepository.save(obj);
                        }
                        return invoiceRepository.save(entity);
                    }),
                    delete: jest.fn().mockImplementation(async (entity, criteria) => {
                        if (criteria) {
                             if (entity === Invoice) return invoiceRepository.delete(criteria);
                             return invoiceRepository.delete(criteria);
                        }
                        return invoiceRepository.delete(entity);
                    }),
                    getRepository: jest.fn().mockImplementation((entity) => {
                        if (entity === Invoice) return invoiceRepository;
                        if (entity === Publication) return publicationRepository;
                        return invoiceRepository;
                    }),
                };
                return cb(managerMock);
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InvoiceService,
                { provide: getRepositoryToken(Invoice), useValue: invoiceRepository },
                { provide: getRepositoryToken(Publication), useValue: publicationRepository },
                { provide: AppConfigService, useValue: { get: jest.fn(async () => 5) } },
                { provide: CostTypeService, useValue: {} },
                { provide: CostCenterService, useValue: {} },
                { provide: DataSource, useValue: dataSource },
            ],
        }).compile();

        service = module.get(InvoiceService);
    });

    it('acquires the parent publication lock when loading one invoice for editing', async () => {
        invoiceRepository.findOne!.mockResolvedValue({
            id: 1,
            publication: { id: 7, locked_at: null, locked_finance: false } as Publication,
        } as Invoice);
        publicationRepository.update!.mockResolvedValue({ affected: 1 } as any);

        const result = await service.get(1, true, 'alice');

        expect(publicationRepository.update).toHaveBeenCalledWith(
            expect.objectContaining({ id: 7, locked_at: expect.any(Object) }),
            expect.objectContaining({ locked_at: expect.any(Date) }),
        );
        expect((result as any)?.locked_at).toBeUndefined();
    });

    it('wraps duplicate invoice save errors in the shared API error format', async () => {
        publicationRepository.find!.mockResolvedValue([{ id: 7, locked_at: null, locked_finance: false } as Publication] as any);
        invoiceRepository.save!.mockRejectedValue({
            code: '23505',
            detail: 'Key (number)=(INV-1) already exists.',
            constraint: 'uq_invoice_number',
        });

        try {
            await service.save([{ publication: { id: 7 } as Publication, number: 'INV-1' } as Invoice], 'alice');
            fail('service.save should throw for duplicate invoice values');
        } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getResponse()).toMatchObject({
                statusCode: 409,
                code: ApiErrorCode.UNIQUE_CONSTRAINT,
                details: expect.arrayContaining([
                    expect.objectContaining({ path: 'number', code: 'unique' }),
                ]),
            });
        }
    });

    it('blocks saving an invoice whose parent publication is locked by another user', async () => {
        EditLockOwnerStore.setOwner('publication', 7, 'alice');
        invoiceRepository.find!.mockResolvedValue([{ id: 1, publication: { id: 7 } as Publication } as Invoice] as any);
        publicationRepository.find!.mockResolvedValue([{ id: 7, locked_at: new Date(), locked_finance: false } as Publication] as any);

        try {
            await service.save([{ id: 1 } as Invoice], 'mallory');
            fail('service.save should reject invoice updates while parent publication is locked');
        } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getResponse()).toMatchObject({
                statusCode: 409,
                code: ApiErrorCode.ENTITY_LOCKED,
            });
        }
        expect(invoiceRepository.save).not.toHaveBeenCalled();
    });

    it('blocks saving an invoice with id 0 when its parent publication id 0 is locked by another user', async () => {
        EditLockOwnerStore.setOwner('publication', 0, 'alice');
        invoiceRepository.find!.mockResolvedValue([{ id: 0, publication: { id: 0 } as Publication } as Invoice] as any);
        publicationRepository.find!.mockResolvedValue([{ id: 0, locked_at: new Date(), locked_finance: false } as Publication] as any);

        try {
            await service.save([{ id: 0 } as Invoice], 'mallory');
            fail('service.save should reject invoice id 0 updates while parent publication is locked');
        } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getResponse()).toMatchObject({
                statusCode: 409,
                code: ApiErrorCode.ENTITY_LOCKED,
            });
        }
        expect(invoiceRepository.save).not.toHaveBeenCalled();
    });

    it('allows the publication lock owner to save an invoice', async () => {
        EditLockOwnerStore.setOwner('publication', 7, 'alice');
        invoiceRepository.find!.mockResolvedValue([{ id: 1, publication: { id: 7 } as Publication } as Invoice] as any);
        publicationRepository.find!.mockResolvedValue([{ id: 7, locked_at: new Date(), locked_finance: false } as Publication] as any);
        invoiceRepository.save!.mockResolvedValue([{ id: 1 } as Invoice] as any);

        await expect(service.save([{ id: 1 } as Invoice], 'alice')).resolves.toEqual([{ id: 1 }]);
    });

    it('marks an invoice as locked when the parent finance section is locked', async () => {
        invoiceRepository.findOne!.mockResolvedValue({
            id: 2,
            publication: { id: 8, locked_at: null, locked_finance: true } as Publication,
        } as Invoice);

        const result = await service.get(2, true, 'alice');

        expect((result as any)?.locked_at).toBeInstanceOf(Date);
    });
});
