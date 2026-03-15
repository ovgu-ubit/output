import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowReportItemLevel } from '../../../output-interfaces/Workflow';
import { PublicationChange } from './PublicationChange.entity';
import { WorkflowReport } from './WorkflowReport.entity';
import { WorkflowReportItem } from './WorkflowReportItem.entity';

export interface FinishWorkflowReportOptions {
    status: string;
    count_import?: number;
    count_update?: number;
    summary?: unknown;
    finished_at?: Date;
}

@Injectable()
export class WorkflowReportService {

    constructor(
        @InjectRepository(WorkflowReport) private workflowReportRepository: Repository<WorkflowReport>,
        @InjectRepository(WorkflowReportItem) private workflowReportItemRepository: Repository<WorkflowReportItem>,
        @InjectRepository(PublicationChange) private publicationChangeRepository: Repository<PublicationChange>,
    ) { }

    async createReport(options: WorkflowReport): Promise<WorkflowReport> {
        return this.workflowReportRepository.save({
            workflowId: options.workflow?.id,
            params: options.params ?? {},
            by_user: options.by_user,
            status: options.status ?? 'started',
            started_at: options.started_at ?? new Date(),
            finished_at: options.finished_at,
            summary: options.summary,
            dry_run: options.dry_run ?? false,
        });
    }

    async save(options: WorkflowReport): Promise<WorkflowReport> {
        if (!options.id) throw new BadRequestException('create report first before saving it');
        return this.workflowReportRepository.save(options);
    }

    async write(workflowReportId: number, content: WorkflowReportItem): Promise<WorkflowReportItem> {
        await this.ensureReportExists(workflowReportId);

        return this.workflowReportItemRepository.save({
            workflowReportId,
            timestamp: content.timestamp ?? new Date(),
            level: this.normalizeLevel(content.level),
            code: content.code,
            message: content.message,
        });
    }

    async finish(workflowReportId: number, content: FinishWorkflowReportOptions): Promise<WorkflowReport> {
        const report = await this.workflowReportRepository.findOneBy({ id: workflowReportId });
        if (!report) throw new NotFoundException(`Workflow report ${workflowReportId} not found`);

        report.status = content.status;
        report.finished_at = content.finished_at ?? new Date();
        report.summary = content.summary ?? {
            count_import: content.count_import ?? 0,
            count_update: content.count_update ?? 0,
        };

        return this.workflowReportRepository.save(report);
    }

    async getReports(workflowId: number): Promise<WorkflowReport[]> {
        return this.workflowReportRepository
            .createQueryBuilder('report')
            .where('report.workflowId = :workflowId', { workflowId })
            .orderBy('report.started_at', 'DESC')
            .addOrderBy('report.id', 'DESC')
            .getMany();
    }

    async getReport(workflowReportId: number): Promise<WorkflowReport> {
        const report = await this.workflowReportRepository.findOneBy({ id: workflowReportId });
        if (!report) throw new NotFoundException(`Workflow report ${workflowReportId} not found`);

        report.items = await this.workflowReportItemRepository
            .createQueryBuilder('item')
            .where('item.workflowReportId = :workflowReportId', { workflowReportId })
            .orderBy('item.timestamp', 'ASC')
            .addOrderBy('item.id', 'ASC')
            .getMany();
        report.publication_changes = await this.publicationChangeRepository
            .createQueryBuilder('publicationChange')
            .where('publicationChange.workflowReportId = :workflowReportId', { workflowReportId })
            .orderBy('publicationChange.timestamp', 'ASC')
            .addOrderBy('publicationChange.id', 'ASC')
            .getMany();

        return report;
    }

    async getReportText(workflowReportId: number): Promise<string> {
        const report = await this.getReport(workflowReportId);
        const lines = report.items?.map((item) => {
            const code = item.code ? ` @ ${item.code}` : '';
            return `${this.format(item.timestamp)} [${item.level}]${code}: ${item.message}`;
        }) ?? [];

        const summaryLines = [
            '',
            '',
            `Status: ${report.status}`,
            `Started: ${this.format(report.started_at)}`,
            `Finished: ${report.finished_at ? this.format(report.finished_at) : '-'}`,
        ];

        if (report.summary !== undefined && report.summary !== null) {
            summaryLines.push(`Summary: ${JSON.stringify(report.summary)}`);
        }

        return [...lines, ...summaryLines].join('\n');
    }

    async deleteReport(workflowReportId: number) {
        await this.ensureReportExists(workflowReportId);
        return this.workflowReportRepository.delete({ id: workflowReportId });
    }

    async createPublicationChange(options: PublicationChange): Promise<PublicationChange> {
        if (options.workflowReport?.id) {
            await this.ensureReportExists(options.workflowReport?.id);
        }

        return this.publicationChangeRepository.save({
            publicationId: options.publication?.id,
            workflowReportId: options.workflowReport?.id ?? null,
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

    private normalizeLevel(level?: WorkflowReportItemLevel | string): WorkflowReportItemLevel {
        switch ((level ?? 'info').toLowerCase()) {
            case WorkflowReportItemLevel.ERROR:
                return WorkflowReportItemLevel.ERROR;
            case WorkflowReportItemLevel.WARNING:
                return WorkflowReportItemLevel.WARNING;
            case WorkflowReportItemLevel.DEBUG:
                return WorkflowReportItemLevel.DEBUG;
            case WorkflowReportItemLevel.INFO:
            default:
                return WorkflowReportItemLevel.INFO;
        }
    }

    private format(timestamp?: Date): string {
        if (!timestamp) return '-';

        const month = timestamp.getMonth() + 1 < 10 ? '0' + (timestamp.getMonth() + 1) : (timestamp.getMonth() + 1);
        const date = timestamp.getDate() < 10 ? '0' + timestamp.getDate() : timestamp.getDate();
        const hours = timestamp.getHours() < 10 ? '0' + timestamp.getHours() : timestamp.getHours();
        const minutes = timestamp.getMinutes() < 10 ? '0' + timestamp.getMinutes() : timestamp.getMinutes();
        const secs = timestamp.getSeconds() < 10 ? '0' + timestamp.getSeconds() : timestamp.getSeconds();
        const msecs = timestamp.getMilliseconds() < 10 ? '00' + timestamp.getMilliseconds() : (timestamp.getMilliseconds() < 100 ? '0' + timestamp.getMilliseconds() : timestamp.getMilliseconds());

        return `${timestamp.getFullYear()}-${month}-${date} ${hours}:${minutes}:${secs}.${msecs}`;
    }
}
