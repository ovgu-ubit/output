import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Observable } from 'rxjs';
import { IsNull, LessThan, Repository } from 'typeorm';
import { Invoice } from './Invoice.entity';
import { CostType } from './CostType.entity';
import { CostCenter } from './CostCenter.entity';
import { Publication } from '../publication/core/Publication.entity';
import { CostCenterIndex, CostTypeIndex } from '../../../output-interfaces/PublicationIndex';
import { CostTypeService } from './cost-type.service';
import { CostCenterService } from './cost-center.service';
import { AppConfigService } from '../config/app-config.service';
import { createEntityLockedHttpException, createPersistenceHttpException } from '../common/api-error';
import { EditLockOwnerStore, isExpiredEditLock, normalizeEditLockDate } from '../common/edit-lock';
import { hasProvidedEntityId } from '../common/entity-id';

const PUBLICATION_LOCK_SCOPE = 'publication';
type LockAnnotatedInvoice = Invoice & { locked_at?: Date };

@Injectable()
export class InvoiceService {
    constructor(
        @InjectRepository(Invoice) private repository: Repository<Invoice>,
        @InjectRepository(Publication) private publicationRepository: Repository<Publication>,
        private configService: AppConfigService,
        private costTypeService: CostTypeService,
        private costCenterService: CostCenterService,
    ) { }

    public async get(id: number, writer = false, user?: string) {
        const invoice = await this.repository.findOne({
            where: { id },
            relations: {
                publication: true,
                cost_center: true,
                cost_items: { cost_type: true },
            },
        });
        if (!invoice) return null;
        return this.resolveInvoiceReadLockState(invoice, writer, user);
    }

    public getForPub(pub: Publication) {
        return this.repository.find({ where: { publication: pub } });
    }

    public async save(inv: Invoice[], user?: string) {
        await this.ensureInvoicesCanBeSaved(inv, user);
        return this.repository.save(inv).catch((error: unknown) => {
            throw createPersistenceHttpException(error);
        });
    }

    public async delete(insts: Invoice[], user?: string) {
        await this.ensureInvoicesCanBeSaved(insts, user);
        return this.repository.delete(insts.map(p => p.id));
    }

    public getCostTypes() {
        return this.costTypeService.get();
    }

    public getCostTypeIndex(reporting_year: number): Promise<CostTypeIndex[]> {
        return this.costTypeService.getCostTypeIndex(reporting_year);
    }

    public getCostType(id: number, writer: boolean, user?: string) {
        return this.costTypeService.one(id, writer, user);
    }

    public saveCT(ct: CostType, user?: string) {
        return this.costTypeService.save(ct, user);
    }

    public deleteCT(cts: CostType[]) {
        return this.costTypeService.delete(cts);
    }

    public findOrSaveCT(title: string, dryRun = false): Observable<CostType> {
        return this.costTypeService.findOrSave(title, dryRun);
    }

    public findOrSaveCC(title: string, dryRun = false): Observable<CostCenter> {
        return this.costCenterService.findOrSave(title, dryRun);
    }

    public getCostCenters() {
        return this.costCenterService.get();
    }

    public async getCostCenterIndex(reporting_year: number): Promise<CostCenterIndex[]> {
        return this.costCenterService.getCostCenterIndex(reporting_year);
    }

    public getCostCenter(id: number, writer: boolean, user?: string) {
        return this.costCenterService.one(id, writer, user);
    }

    public saveCC(cc: CostCenter, user?: string) {
        return this.costCenterService.save(cc, user);
    }

    public deleteCC(ccs: CostCenter[]) {
        return this.costCenterService.delete(ccs);
    }

    private async resolveInvoiceReadLockState(invoice: Invoice, writer: boolean, user?: string): Promise<Invoice> {
        const publication = invoice.publication;
        if (!publication) return invoice;

        if (publication.locked_finance) {
            return this.withInvoiceLock(invoice, normalizeEditLockDate(publication.locked_at) ?? new Date());
        }

        if (!writer) {
            return this.attachInvoiceLockFromPublication(invoice, publication);
        }

        const lockTimeoutMs = await this.getLockTimeoutMs();
        const lockedAt = normalizeEditLockDate(publication.locked_at);

        if (lockedAt && !isExpiredEditLock(lockedAt, lockTimeoutMs)) {
            if (user && EditLockOwnerStore.getOwner(PUBLICATION_LOCK_SCOPE, publication.id) === user) {
                return this.withInvoiceLock(invoice, undefined);
            }
            return this.withInvoiceLock(invoice, lockedAt);
        }

        const now = new Date();
        const lockCriteria = !lockedAt
            ? { id: publication.id, locked_at: IsNull() }
            : { id: publication.id, locked_at: LessThan(new Date(now.getTime() - lockTimeoutMs)) };

        const updateResult = await this.publicationRepository.update(lockCriteria as never, { locked_at: now } as never);
        if (!updateResult.affected) {
            const refreshed = await this.repository.findOne({
                where: { id: invoice.id },
                relations: { publication: true, cost_center: true, cost_items: { cost_type: true } },
            });
            if (!refreshed) return invoice;
            return this.attachInvoiceLockFromPublication(refreshed, refreshed.publication);
        }

        if (user && hasProvidedEntityId(publication.id)) {
            EditLockOwnerStore.setOwner(PUBLICATION_LOCK_SCOPE, publication.id, user);
        }

        return this.withInvoiceLock(invoice, undefined);
    }

    private async ensureInvoicesCanBeSaved(invoices: Invoice[], user?: string): Promise<void> {
        if (!invoices.length) return;

        const existingIds = invoices.map((invoice) => invoice.id).filter((id): id is number => hasProvidedEntityId(id));
        const existingInvoices = existingIds.length > 0
            ? await this.repository.find({
                where: existingIds.map((id) => ({ id })),
                relations: { publication: true },
            })
            : [];
        const existingMap = new Map(existingInvoices.map((invoice) => [invoice.id, invoice]));

        const publicationIds = new Set<number>();
        for (const invoice of invoices) {
            const publicationId = invoice.publication?.id ?? existingMap.get(invoice.id)?.publication?.id;
            if (hasProvidedEntityId(publicationId)) publicationIds.add(publicationId);
        }

        const publications = publicationIds.size > 0
            ? await this.publicationRepository.find({
                where: [...publicationIds].map((id) => ({ id })),
            })
            : [];
        const publicationMap = new Map(publications.map((publication) => [publication.id, publication]));

        for (const invoice of invoices) {
            const publicationId = invoice.publication?.id ?? existingMap.get(invoice.id)?.publication?.id;
            if (!hasProvidedEntityId(publicationId)) continue;
            const publication = publicationMap.get(publicationId);
            await this.ensurePublicationEditable(publication, user);
        }
    }

    private async ensurePublicationEditable(publication: Publication | undefined, user?: string): Promise<void> {
        if (!hasProvidedEntityId(publication?.id)) return;

        if (publication.locked_finance) {
            throw createEntityLockedHttpException();
        }

        if (!publication.locked_at) {
            EditLockOwnerStore.release(PUBLICATION_LOCK_SCOPE, publication.id);
            return;
        }

        const lockTimeoutMs = await this.getLockTimeoutMs();
        if (isExpiredEditLock(publication.locked_at, lockTimeoutMs)) {
            EditLockOwnerStore.release(PUBLICATION_LOCK_SCOPE, publication.id);
            return;
        }

        const owner = EditLockOwnerStore.getOwner(PUBLICATION_LOCK_SCOPE, publication.id);
        if (!user || owner !== user) {
            throw createEntityLockedHttpException();
        }
    }

    private attachInvoiceLockFromPublication(invoice: Invoice, publication?: Publication): Invoice {
        if (!publication?.locked_finance && !publication?.locked_at) return invoice;
        return this.withInvoiceLock(invoice, normalizeEditLockDate(publication?.locked_at) ?? new Date());
    }

    private async getLockTimeoutMs(): Promise<number> {
        const timeoutInMinutes = Number(await this.configService.get('lock_timeout'));
        const resolvedMinutes = Number.isFinite(timeoutInMinutes) && timeoutInMinutes >= 0 ? timeoutInMinutes : 5;
        return resolvedMinutes * 60 * 1000;
    }

    private withInvoiceLock(invoice: Invoice, lockedAt: Date | undefined): Invoice {
        return {
            ...(invoice as LockAnnotatedInvoice),
            locked_at: lockedAt,
        } as LockAnnotatedInvoice;
    }
}
