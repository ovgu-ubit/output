import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowReport } from '../../workflow/WorkflowReport.entity';
import { PublicationChange } from './PublicationChange.entity';

@Injectable()
export class PublicationChangeService {

    constructor(
        @InjectRepository(PublicationChange) private publicationChangeRepository: Repository<PublicationChange>,
        @InjectRepository(WorkflowReport) private workflowReportRepository: Repository<WorkflowReport>,
    ) { }

    async createPublicationChange(options: PublicationChange): Promise<PublicationChange> {
        if (options.workflowReport?.id) {
            await this.ensureReportExists(options.workflowReport.id);
        }

        return this.publicationChangeRepository.save({
            publication: options.publication,
            workflowReport: options.workflowReport,
            timestamp: options.timestamp ?? new Date(),
            by_user: options.by_user,
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

    async deletePublicationChangesForPublications(publicationIds: number[]): Promise<void> {
        const ids = publicationIds.filter((publicationId): publicationId is number => Number.isInteger(publicationId));
        if (ids.length === 0) return;

        await this.publicationChangeRepository
            .createQueryBuilder()
            .delete()
            .from(PublicationChange)
            .where('publicationId IN (:...publicationIds)', { publicationIds: ids })
            .execute();
    }

    private async ensureReportExists(workflowReportId: number) {
        const exists = await this.workflowReportRepository.existsBy({ id: workflowReportId });
        if (!exists) throw new NotFoundException(`Workflow report ${workflowReportId} not found`);
    }

    private hydrateWorkflowReport(change: PublicationChange): PublicationChange {
        if (!change.workflowReport) return change;
        change.workflowReport.workflow = change.workflowReport.workflow_type === 'export'
            ? change.workflowReport.exportWorkflow
            : change.workflowReport.importWorkflow;
        change.workflowReport.workflowId = change.workflowReport.workflow?.id;
        return change;
    }
}
