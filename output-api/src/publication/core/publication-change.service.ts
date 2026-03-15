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
        return this.publicationChangeRepository
            .createQueryBuilder('publicationChange')
            .where('publicationChange.publicationId = :publicationId', { publicationId })
            .orderBy('publicationChange.timestamp', 'DESC')
            .addOrderBy('publicationChange.id', 'DESC')
            .getMany();
    }

    async getPublicationChangesForReport(workflowReportId: number): Promise<PublicationChange[]> {
        return this.publicationChangeRepository
            .createQueryBuilder('publicationChange')
            .where('publicationChange.workflowReportId = :workflowReportId', { workflowReportId })
            .orderBy('publicationChange.timestamp', 'ASC')
            .addOrderBy('publicationChange.id', 'ASC')
            .getMany();
    }

    private async ensureReportExists(workflowReportId: number) {
        const exists = await this.workflowReportRepository.existsBy({ id: workflowReportId });
        if (!exists) throw new NotFoundException(`Workflow report ${workflowReportId} not found`);
    }
}
