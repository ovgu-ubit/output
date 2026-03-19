import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExportWorkflow, ImportWorkflow, WorkflowReportItemLevel, WorkflowType } from '../../../output-interfaces/Workflow';
import { PublicationChangeService } from '../publication/core/publication-change.service';
import { WorkflowReport } from './WorkflowReport.entity';
import { WorkflowReportItem } from './WorkflowReportItem.entity';

export interface FinishWorkflowReportOptions {
    status: string;
    count_import?: number;
    count_update?: number;
    summary?: unknown;
    finished_at?: Date;
}

export interface UpdateWorkflowReportStatusOptions {
    status?: string;
    progress?: number;
    started_at?: Date;
    finished_at?: Date | null;
    by_user?: string;
    params?: unknown;
    dry_run?: boolean;
    summary?: unknown;
}

@Injectable()
export class WorkflowReportService {

    constructor(
        @InjectRepository(WorkflowReport) private workflowReportRepository: Repository<WorkflowReport>,
        @InjectRepository(WorkflowReportItem) private workflowReportItemRepository: Repository<WorkflowReportItem>,
        private publicationChangeService: PublicationChangeService,
    ) { }

    async createReport(options: WorkflowReport): Promise<WorkflowReport> {
        const saved = await this.workflowReportRepository.save({
            workflow_type: options.workflow_type ?? this.resolveWorkflowType(options),
            importWorkflow: options.importWorkflow ?? ((options.workflow_type ?? this.resolveWorkflowType(options)) === WorkflowType.IMPORT ? options.workflow as ImportWorkflow : undefined),
            exportWorkflow: options.exportWorkflow ?? ((options.workflow_type ?? this.resolveWorkflowType(options)) === WorkflowType.EXPORT ? options.workflow as ExportWorkflow : undefined),
            params: options.params ?? {},
            by_user: options.by_user,
            status: options.status ?? 'started',
            progress: options.progress ?? 0,
            started_at: options.started_at ?? new Date(),
            finished_at: options.finished_at,
            summary: options.summary,
            dry_run: options.dry_run ?? false,
        });
        return this.hydrateWorkflowReference(saved);
    }

    async save(options: WorkflowReport): Promise<WorkflowReport> {
        if (!options.id) throw new BadRequestException('create report first before saving it');
        return this.hydrateWorkflowReference(await this.workflowReportRepository.save(options));
    }

    async write(workflowReportId: number, content: WorkflowReportItem): Promise<WorkflowReportItem> {
        const workflowReport = await this.workflowReportRepository.findOneBy({ id: workflowReportId });
        if (!workflowReport) throw new NotFoundException(`Workflow report ${workflowReportId} not found`);
        return this.workflowReportItemRepository.save({
            workflowReport,
            timestamp: content.timestamp ?? new Date(),
            level: this.normalizeLevel(content.level),
            code: content.code,
            message: content.message,
        });
    }

    async updateStatus(workflowReportId: number, content: UpdateWorkflowReportStatusOptions): Promise<WorkflowReport> {
        const report = await this.workflowReportRepository.findOneBy({ id: workflowReportId });
        if (!report) throw new NotFoundException(`Workflow report ${workflowReportId} not found`);

        if (content.status !== undefined) report.status = content.status;
        if (content.progress !== undefined) report.progress = content.progress;
        if (content.started_at !== undefined) report.started_at = content.started_at;
        if (content.finished_at !== undefined) report.finished_at = content.finished_at ?? undefined;
        if (content.by_user !== undefined) report.by_user = content.by_user;
        if (content.params !== undefined) report.params = content.params;
        if (content.dry_run !== undefined) report.dry_run = content.dry_run;
        if (content.summary !== undefined) report.summary = content.summary;

        return this.hydrateWorkflowReference(await this.workflowReportRepository.save(report));
    }

    async finish(workflowReportId: number, content: FinishWorkflowReportOptions): Promise<WorkflowReport> {
        const report = await this.workflowReportRepository.findOneBy({ id: workflowReportId });
        if (!report) throw new NotFoundException(`Workflow report ${workflowReportId} not found`);

        report.status = content.status;
        report.progress = 0;
        report.finished_at = content.finished_at ?? new Date();
        report.summary = content.summary ?? {
            count_import: content.count_import ?? 0,
            count_update: content.count_update ?? 0,
        };

        return this.hydrateWorkflowReference(await this.workflowReportRepository.save(report));
    }

    async getStatusForWorkflow(workflowId: number, workflowType: WorkflowType = WorkflowType.IMPORT): Promise<{ progress: number, status: string }> {
        const reports = await this.getReports(workflowId, workflowType);
        if (reports.length === 0) {
            return { progress: 0, status: 'initialized' };
        }

        const activeReport = reports[0]; //last started report is considered active, even if it has a finished_at timestamp (to cover cases where a report was not properly finished)
        return {
            progress: activeReport.progress ?? 0,
            status: activeReport.status ?? 'initialized',
        };
    }

    async getReports(workflowId: number, workflowType: WorkflowType = WorkflowType.IMPORT): Promise<WorkflowReport[]> {
        const reports = await this.workflowReportRepository
            .createQueryBuilder('report')
            .leftJoinAndSelect('report.importWorkflow', 'importWorkflow')
            .leftJoinAndSelect('report.exportWorkflow', 'exportWorkflow')
            .where('report.workflow_type = :workflowType', { workflowType })
            .andWhere(`report.${this.getWorkflowColumn(workflowType)} = :workflowId`, { workflowId })
            .orderBy('report.started_at', 'DESC')
            .addOrderBy('report.id', 'DESC')
            .getMany();
        return reports.map((report) => this.hydrateWorkflowReference(report));
    }

    async getReport(workflowReportId: number): Promise<WorkflowReport> {
        const report = await this.workflowReportRepository.findOne({
            where: { id: workflowReportId },
            relations: {
                importWorkflow: true,
                exportWorkflow: true,
            }
        });
        if (!report) throw new NotFoundException(`Workflow report ${workflowReportId} not found`);

        report.items = await this.workflowReportItemRepository
            .createQueryBuilder('item')
            .where('item.workflowReportId = :workflowReportId', { workflowReportId })
            .orderBy('item.timestamp', 'ASC')
            .addOrderBy('item.id', 'ASC')
            .getMany();
        report.publication_changes = await this.publicationChangeService.getPublicationChangesForReport(workflowReportId);

        return this.hydrateWorkflowReference(report);
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

    async deleteReportsForWorkflow(workflowId: number, workflowType: WorkflowType = WorkflowType.IMPORT): Promise<void> {
        const reports = await this.workflowReportRepository
            .createQueryBuilder('report')
            .select('report.id', 'id')
            .where('report.workflow_type = :workflowType', { workflowType })
            .andWhere(`report.${this.getWorkflowColumn(workflowType)} = :workflowId`, { workflowId })
            .getRawMany<{ id: number }>();

        const reportIds = reports
            .map((report) => Number(report.id))
            .filter((reportId) => Number.isInteger(reportId));

        if (reportIds.length === 0) return;

        await this.workflowReportRepository.delete(reportIds);
    }

    private resolveWorkflowType(options: WorkflowReport): WorkflowType {
        if (options.workflow_type) return options.workflow_type;
        if (options.exportWorkflow) return WorkflowType.EXPORT;
        if (options.importWorkflow) return WorkflowType.IMPORT;
        return WorkflowType.IMPORT;
    }

    private getWorkflowColumn(workflowType: WorkflowType) {
        return workflowType === WorkflowType.EXPORT ? 'exportWorkflowId' : 'workflowId';
    }

    private hydrateWorkflowReference(report: WorkflowReport): WorkflowReport {
        report.workflow = report.workflow_type === WorkflowType.EXPORT ? report.exportWorkflow : report.importWorkflow;
        report.workflowId = report.workflow?.id;
        return report;
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
