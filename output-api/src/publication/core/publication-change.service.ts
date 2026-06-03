import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { createNotFoundHttpException } from '../../common/api-error';
import { hasProvidedEntityId } from '../../common/entity-id';
import { WorkflowReport } from '../../workflow/WorkflowReport.entity';
import { Publication } from './Publication.entity';
import { PublicationChange } from './PublicationChange.entity';

@Injectable()
export class PublicationChangeService {

    constructor(
        @InjectRepository(Publication) private publicationRepository: Repository<Publication>,
        @InjectRepository(PublicationChange) private publicationChangeRepository: Repository<PublicationChange>,
        @InjectRepository(WorkflowReport) private workflowReportRepository: Repository<WorkflowReport>,
    ) { }

    async createPublicationChange(options: PublicationChange, manager?: EntityManager): Promise<PublicationChange> {
        const repo = manager ? manager.getRepository(PublicationChange) : this.publicationChangeRepository;
        const reportRepo = manager ? manager.getRepository(WorkflowReport) : this.workflowReportRepository;

        if (hasProvidedEntityId(options.workflowReport?.id)) {
            const exists = await reportRepo.existsBy({ id: options.workflowReport.id });
            if (!exists) throw createNotFoundHttpException(`Workflow report ${options.workflowReport.id} not found`);
        }

        return repo.save({
            publication: options.publication,
            workflowReport: options.workflowReport,
            timestamp: options.timestamp ?? new Date(),
            by_user: options.by_user ? 'user' : undefined,
            patch_data: options.patch_data,
            dry_change: options.dry_change ?? false,
        });
    }

    async getPublicationChangesForPublication(publicationId: number): Promise<PublicationChange[]> {
        const changes = await this.publicationChangeRepository
            .createQueryBuilder('publicationChange')
            .leftJoinAndSelect('publicationChange.workflowReport', 'workflowReport')
            .leftJoinAndSelect('workflowReport.importWorkflow', 'importWorkflow')
            .leftJoinAndSelect('workflowReport.exportWorkflow', 'exportWorkflow')
            .where('publicationChange.publicationId = :publicationId', { publicationId })
            .orderBy('publicationChange.timestamp', 'DESC')
            .addOrderBy('publicationChange.id', 'DESC')
            .getMany();
        return changes.map((change) => this.hydrateWorkflowReport(change));
    }

    async getPublicationChangesForReport(workflowReportId: number): Promise<PublicationChange[]> {
        const changes = await this.publicationChangeRepository
            .createQueryBuilder('publicationChange')
            .leftJoinAndSelect('publicationChange.workflowReport', 'workflowReport')
            .leftJoinAndSelect('workflowReport.importWorkflow', 'importWorkflow')
            .leftJoinAndSelect('workflowReport.exportWorkflow', 'exportWorkflow')
            .where('publicationChange.workflowReportId = :workflowReportId', { workflowReportId })
            .orderBy('publicationChange.timestamp', 'ASC')
            .addOrderBy('publicationChange.id', 'ASC')
            .getMany();
        return changes.map((change) => this.hydrateWorkflowReport(change));
    }

    async deletePublicationChangesForPublications(publicationIds: number[], manager?: EntityManager): Promise<void> {
        const ids = publicationIds.filter((publicationId): publicationId is number => Number.isInteger(publicationId));
        if (ids.length === 0) return;

        const repo = manager ? manager.getRepository(PublicationChange) : this.publicationChangeRepository;
        await repo
            .createQueryBuilder()
            .delete()
            .from(PublicationChange)
            .where('publicationId IN (:...publicationIds)', { publicationIds: ids })
            .execute();
    }

    async loadPublicationsForChangeLog(publications: Publication[], manager?: EntityManager): Promise<Map<number, Publication>> {
        const ids = publications.map((publication) => publication.id).filter((id): id is number => hasProvidedEntityId(id));
        if (ids.length === 0) return new Map<number, Publication>();

        const repo = manager ? manager.getRepository(Publication) : this.publicationRepository;
        const existing = await repo.find({
            where: { id: In(ids) },
            relations: {
                pub_type: true,
                oa_category: true,
                greater_entity: true,
                publisher: true,
                contract: true,
                funders: true,
                invoices: {
                    cost_items: {
                        cost_type: true
                    },
                    cost_center: true
                },
                language: true,
                identifiers: true,
                supplements: true,
                authorPublications: {
                    author: true,
                    institute: true,
                    role: true
                }
            },
            withDeleted: true
        });

        return new Map(existing.map((publication) => [publication.id, publication]));
    }

    async loadPublicationForChangeLog(id: number, manager?: EntityManager): Promise<Publication | null> {
        return (await this.loadPublicationsForChangeLog([{ id } as Publication], manager)).get(id) ?? null;
    }

    buildPublicationChangePatch(before?: Publication | null, after?: Publication | null) {
        const beforeSnapshot = before ? this.buildPublicationChangeSnapshot(before) : null;
        const afterSnapshot = after ? this.buildPublicationChangeSnapshot(after) : null;
        const beforePatch = {};
        const afterPatch = {};

        if (!beforeSnapshot && !afterSnapshot) return null;

        const keys = beforeSnapshot
            ? Array.from(new Set([...Object.keys(beforeSnapshot), ...Object.keys(afterSnapshot ?? {})]))
            : Object.keys(afterSnapshot ?? {}).filter((key) => this.hasPublicationChangeValue(afterSnapshot?.[key]));

        for (const key of keys) {
            const beforeValue = beforeSnapshot?.[key];
            const afterValue = afterSnapshot?.[key];

            if (!beforeSnapshot && !this.hasPublicationChangeValue(afterValue)) continue;
            if (this.arePublicationChangeValuesEqual(beforeValue, afterValue)) continue;

            if (beforeSnapshot) beforePatch[key] = beforeValue ?? null;
            if (afterSnapshot) afterPatch[key] = afterValue ?? null;
        }

        if (Object.keys(beforePatch).length === 0 && Object.keys(afterPatch).length === 0) return null;

        return {
            before: Object.keys(beforePatch).length > 0 ? beforePatch : null,
            after: Object.keys(afterPatch).length > 0 ? afterPatch : null,
        };
    }

    private hydrateWorkflowReport(change: PublicationChange): PublicationChange {
        if (!change.workflowReport) return change;
        change.workflowReport.workflow = change.workflowReport.workflow_type === 'export'
            ? change.workflowReport.exportWorkflow
            : change.workflowReport.importWorkflow;
        change.workflowReport.workflowId = change.workflowReport.workflow?.id;
        return change;
    }

    private buildPublicationChangeSnapshot(publication: Publication) {
        return {
            authors: publication.authors,
            title: publication.title,
            doi: publication.doi,
            pub_date: this.serializeDate(publication.pub_date),
            pub_date_submitted: this.serializeDate(publication.pub_date_submitted),
            pub_date_accepted: this.serializeDate(publication.pub_date_accepted),
            pub_date_print: this.serializeDate(publication.pub_date_print),
            link: publication.link,
            dataSource: publication.dataSource,
            language: publication.language ? { id: publication.language.id, label: publication.language['label'] } : null,
            add_info: publication.add_info,
            status: publication.status,
            is_oa: publication.is_oa,
            oa_status: publication.oa_status,
            is_journal_oa: publication.is_journal_oa,
            best_oa_host: publication.best_oa_host,
            best_oa_license: publication.best_oa_license,
            abstract: publication.abstract,
            volume: publication.volume,
            issue: publication.issue,
            first_page: publication.first_page,
            last_page: publication.last_page,
            publisher_location: publication.publisher_location,
            edition: publication.edition,
            article_number: publication.article_number,
            page_count: publication.page_count,
            peer_reviewed: publication.peer_reviewed,
            cost_approach: publication.cost_approach,
            cost_approach_currency: publication.cost_approach_currency,
            not_budget_relevant: publication.not_budget_relevant,
            grant_number: publication.grant_number,
            contract_year: publication.contract_year,
            pub_type: publication.pub_type ? { id: publication.pub_type.id, label: publication.pub_type['label'] } : null,
            oa_category: publication.oa_category ? { id: publication.oa_category.id, label: publication.oa_category['label'] } : null,
            greater_entity: publication.greater_entity ? { id: publication.greater_entity.id, label: publication.greater_entity['label'] } : null,
            publisher: publication.publisher ? { id: publication.publisher.id, label: publication.publisher['label'] } : null,
            contract: publication.contract ? { id: publication.contract.id, label: publication.contract['label'] } : null,
            funders: publication.funders?.map((funder) => ({ id: funder.id, label: funder.label, doi: funder.doi })) ?? [],
            invoices: publication.invoices?.map((invoice) => ({
                id: invoice.id,
                number: invoice.number,
                date: this.serializeDate(invoice.date),
                booking_date: this.serializeDate(invoice.booking_date),
                booking_amount: invoice.booking_amount,
                cost_center: invoice.cost_center ? { id: invoice.cost_center.id, label: invoice.cost_center['label'] } : null,
                cost_items: invoice.cost_items?.map((costItem) => ({
                    id: costItem.id,
                    euro_value: costItem.euro_value,
                    orig_value: costItem.orig_value,
                    orig_currency: costItem.orig_currency,
                    vat: costItem.vat,
                    cost_type: costItem.cost_type ? { id: costItem.cost_type.id, label: costItem.cost_type['label'] } : null
                })) ?? []
            })) ?? [],
            identifiers: publication.identifiers?.map((identifier) => ({
                type: identifier.type,
                value: identifier.value
            })) ?? [],
            supplements: publication.supplements?.map((supplement) => ({
                link: supplement.link
            })) ?? [],
            authorPublications: publication.authorPublications?.map((ap) => ({
                author: ap.author ? { id: ap.author.id, last_name: ap.author.last_name, first_name: ap.author.first_name } : { id: ap.authorId },
                institute: ap.institute ? { id: ap.institute.id, label: ap.institute.label } : null,
                role: ap.role ? { id: ap.role.id, label: ap.role.label } : null,
                corresponding: ap.corresponding,
                affiliation: ap.affiliation
            })) ?? []
        };
    }

    private arePublicationChangeValuesEqual(before: unknown, after: unknown): boolean {
        if (before === after) return true;
        if (this.isLogicalEmpty(before) && this.isLogicalEmpty(after)) return true;
        return JSON.stringify(before) === JSON.stringify(after);
    }

    private hasPublicationChangeValue(value: unknown): boolean {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.length > 0;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object') return Object.keys(value).length > 0;
        return true;
    }

    private isLogicalEmpty(value: unknown): boolean {
        return value === null || value === undefined || value === '';
    }

    private serializeDate(date?: Date) {
        return date ? new Date(date).toISOString() : null;
    }
}
