import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExportWorkflow, ImportWorkflow, ValidationWorkflow, WorkflowReportItemLevel, WorkflowType } from '../../../output-interfaces/Workflow';
import { hasProvidedEntityId } from '../common/entity-id';
import { AppConfigService } from '../config/app-config.service';
import { PublicationChangeService } from '../publication/core/publication-change.service';
import { WorkflowReport } from './WorkflowReport.entity';
import { WorkflowReportItem } from './WorkflowReportItem.entity';
import { createInvalidRequestHttpException, createNotFoundHttpException, createWorkflowRunningHttpException } from '../common/api-error';

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

export interface WorkflowRunStatus {
    progress: number;
    status: string;
    stale?: boolean;
    reportId?: number;
}

export interface WaitForCompletionOptions {
    allowStale?: boolean;
    signal?: AbortSignal;
}

@Injectable()
export class WorkflowReportService {
    private readonly pendingCompletionWaits = new Map<number, number>();

    constructor(
        @InjectRepository(WorkflowReport) private workflowReportRepository: Repository<WorkflowReport>,
        @InjectRepository(WorkflowReportItem) private workflowReportItemRepository: Repository<WorkflowReportItem>,
        private configService: AppConfigService,
        private publicationChangeService: PublicationChangeService,
    ) { }

    async createReport(options: WorkflowReport): Promise<WorkflowReport> {
        const workflowType = options.workflow_type ?? this.resolveWorkflowType(options);
        const saved = await this.workflowReportRepository.save({
            workflow_type: workflowType,
            importWorkflow: options.importWorkflow ?? (workflowType === WorkflowType.IMPORT ? options.workflow as ImportWorkflow : undefined),
            exportWorkflow: options.exportWorkflow ?? (workflowType === WorkflowType.EXPORT ? options.workflow as ExportWorkflow : undefined),
            validationWorkflow: options.validationWorkflow ?? (workflowType === WorkflowType.VALIDATION ? options.workflow as ValidationWorkflow : undefined),
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
        if (!hasProvidedEntityId(options.id)) throw createInvalidRequestHttpException('create report first before saving it');
        return this.hydrateWorkflowReference(await this.workflowReportRepository.save(options));
    }

    async write(workflowReportId: number, content: WorkflowReportItem): Promise<WorkflowReportItem> {
        const touchResult = await this.workflowReportRepository.update(
            { id: workflowReportId },
            { updated_at: new Date() }
        );
        if (!touchResult.affected) throw createNotFoundHttpException(`Workflow report ${workflowReportId} not found`);
        return this.workflowReportItemRepository.save({
            workflowReport: { id: workflowReportId } as WorkflowReport,
            timestamp: content.timestamp ?? new Date(),
            level: this.normalizeLevel(content.level),
            code: content.code,
            message: content.message,
        });
    }

    async updateStatus(workflowReportId: number, content: UpdateWorkflowReportStatusOptions): Promise<WorkflowReport> {
        const report = await this.workflowReportRepository.findOneBy({ id: workflowReportId });
        if (!report) throw createNotFoundHttpException(`Workflow report ${workflowReportId} not found`);

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
        if (!report) throw createNotFoundHttpException(`Workflow report ${workflowReportId} not found`);

        report.status = content.status;
        report.progress = 0;
        report.finished_at = content.finished_at ?? new Date();
        report.summary = content.summary ?? {
            count_import: content.count_import ?? 0,
            count_update: content.count_update ?? 0,
        };

        return this.hydrateWorkflowReference(await this.workflowReportRepository.save(report));
    }

    async getStatusForWorkflow(workflowId: number, workflowType: WorkflowType = WorkflowType.IMPORT): Promise<WorkflowRunStatus> {
        const latestReport = await this.getLatestReport(workflowId, workflowType);
        if (!latestReport) {
            return { progress: 0, status: 'initialized' };
        }

        const staleTimeoutMs = await this.getStaleTimeoutMs();
        if (!latestReport.finished_at && this.isReportStale(latestReport, staleTimeoutMs)) {
            return this.toRunStatus(latestReport, true);
        }

        return this.toRunStatus(latestReport);
    }

    async getReports(
        workflowId: number,
        workflowType: WorkflowType = WorkflowType.IMPORT,
        options?: { limit?: number; offset?: number }
    ): Promise<WorkflowReport[]> {
        const query = this.workflowReportRepository
            .createQueryBuilder('report')
            .leftJoinAndSelect('report.importWorkflow', 'importWorkflow')
            .leftJoinAndSelect('report.exportWorkflow', 'exportWorkflow')
            .leftJoinAndSelect('report.validationWorkflow', 'validationWorkflow')
            .where('report.workflow_type = :workflowType', { workflowType })
            .orderBy('report.started_at', 'DESC')
            .addOrderBy('report.id', 'DESC');

        this.applyWorkflowIdFilter(query, workflowType, workflowId);

        if (options?.offset !== undefined && options.offset >= 0) {
            query.skip(options.offset);
        }
        if (options?.limit !== undefined && options.limit >= 0) {
            query.take(options.limit);
        }

        const reports = await query.getMany();
        return reports.map((report) => this.hydrateWorkflowReference(report));
    }

    async getReport(workflowReportId: number): Promise<WorkflowReport> {
        const report = await this.workflowReportRepository.findOne({
            where: { id: workflowReportId },
            relations: {
                importWorkflow: true,
                exportWorkflow: true,
                validationWorkflow: true,
            }
        });
        if (!report) throw createNotFoundHttpException(`Workflow report ${workflowReportId} not found`);

        report.items = await this.workflowReportItemRepository
            .createQueryBuilder('item')
            .where('item.workflowReportId = :workflowReportId', { workflowReportId })
            .orderBy('item.timestamp', 'ASC')
            .addOrderBy('item.id', 'ASC')
            .getMany();
        report.publication_changes = await this.publicationChangeService.getPublicationChangesForReport(workflowReportId);

        return this.hydrateWorkflowReference(report);
    }

    async waitForCompletion(
        workflowReportId: number,
        pollIntervalMs = 500,
        options: WaitForCompletionOptions = {}
    ): Promise<WorkflowReport> {
        const staleTimeoutMs = await this.getStaleTimeoutMs();
        const allowStale = options.allowStale ?? true;
        const signal = options.signal;

        while (true) {
            this.throwIfAborted(signal);
            const report = await this.workflowReportRepository.findOneBy({ id: workflowReportId });
            if (!report) throw createNotFoundHttpException(`Workflow report ${workflowReportId} not found`);

            const hydratedReport = this.hydrateWorkflowReference(report);
            if (hydratedReport.finished_at || (allowStale && this.isReportStale(hydratedReport, staleTimeoutMs))) {
                return hydratedReport;
            }

            await this.sleep(pollIntervalMs, signal);
        }
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
        if (this.isDeletionBlocked(workflowReportId)) {
            throw createWorkflowRunningHttpException(`Workflow report ${workflowReportId} is still active`);
        }
        await this.ensureReportExists(workflowReportId);
        return this.workflowReportRepository.delete({ id: workflowReportId });
    }

    registerCompletionWait(workflowReportId: number): void {
        const activeWaits = this.pendingCompletionWaits.get(workflowReportId) ?? 0;
        this.pendingCompletionWaits.set(workflowReportId, activeWaits + 1);
    }

    releaseCompletionWait(workflowReportId: number): void {
        const activeWaits = this.pendingCompletionWaits.get(workflowReportId);
        if (!activeWaits || activeWaits <= 1) {
            this.pendingCompletionWaits.delete(workflowReportId);
            return;
        }

        this.pendingCompletionWaits.set(workflowReportId, activeWaits - 1);
    }

    async deleteReportsForWorkflow(workflowId: number, workflowType: WorkflowType = WorkflowType.IMPORT): Promise<void> {
        const query = this.workflowReportRepository
            .createQueryBuilder('report')
            .select('report.id', 'id')
            .where('report.workflow_type = :workflowType', { workflowType });

        this.applyWorkflowIdFilter(query, workflowType, workflowId);

        const reports = await query.getRawMany<{ id: number }>();

        const reportIds = reports
            .map((report) => Number(report.id))
            .filter((reportId) => Number.isInteger(reportId));

        if (reportIds.length === 0) return;

        await this.workflowReportRepository.delete(reportIds);
    }

    private resolveWorkflowType(options: WorkflowReport): WorkflowType {
        if (options.workflow_type) return options.workflow_type;
        if (options.exportWorkflow) return WorkflowType.EXPORT;
        if (options.validationWorkflow) return WorkflowType.VALIDATION;
        if (options.importWorkflow) return WorkflowType.IMPORT;
        return WorkflowType.IMPORT;
    }

    private async getLatestReport(
        workflowId: number,
        workflowType: WorkflowType = WorkflowType.IMPORT
    ): Promise<WorkflowReport | undefined> {
        const reports = await this.getReports(workflowId, workflowType, { limit: 1 });
        return reports[0];
    }

    private hydrateWorkflowReference(report: WorkflowReport): WorkflowReport {
        switch (report.workflow_type) {
            case WorkflowType.EXPORT:
                report.workflow = report.exportWorkflow;
                break;
            case WorkflowType.VALIDATION:
                report.workflow = report.validationWorkflow;
                break;
            case WorkflowType.IMPORT:
            default:
                report.workflow = report.importWorkflow;
                break;
        }
        report.workflowId = report.workflow?.id;
        return report;
    }

    private applyWorkflowIdFilter<T extends { andWhere: (condition: string, parameters?: object) => T }>(
        query: T,
        workflowType: WorkflowType,
        workflowId: number,
    ) {
        if (workflowType === WorkflowType.EXPORT) {
            query.andWhere('report.exportWorkflowId = :workflowId', { workflowId });
            return query;
        }
        if (workflowType === WorkflowType.VALIDATION) {
            query.andWhere('report.validationWorkflowId = :workflowId', { workflowId });
            return query;
        }

        query.andWhere('report.workflowId = :workflowId', { workflowId });
        return query;
    }

    private toRunStatus(report: WorkflowReport, stale = false): WorkflowRunStatus {
        return {
            progress: stale ? 0 : (report.progress ?? 0),
            status: stale ? this.buildStaleStatus(report.status) : (report.status ?? 'initialized'),
            stale,
            reportId: report.id,
        };
    }

    private buildStaleStatus(status?: string): string {
        return status && status.trim().length > 0 ? `${status} [stale]` : 'stale';
    }

    private isReportStale(report: WorkflowReport, staleTimeoutMs: number): boolean {
        if (report.finished_at) return false;
        const activityAt = this.getActivityTimestamp(report);
        if (!activityAt) return true;
        return (Date.now() - activityAt.getTime()) > staleTimeoutMs;
    }

    private getActivityTimestamp(report: WorkflowReport): Date | undefined {
        if (report.updated_at instanceof Date) return report.updated_at;
        if (report.updated_at) return new Date(report.updated_at);
        if (report.started_at instanceof Date) return report.started_at;
        if (report.started_at) return new Date(report.started_at);
        return undefined;
    }

    private async getStaleTimeoutMs(): Promise<number> {
        const timeoutInMinutes = Number(await this.configService.get('lock_timeout'));
        return (Number.isFinite(timeoutInMinutes) && timeoutInMinutes >= 0 ? timeoutInMinutes : 5) * 60 * 1000;
    }

    private async ensureReportExists(workflowReportId: number) {
        const exists = await this.workflowReportRepository.existsBy({ id: workflowReportId });
        if (!exists) throw createNotFoundHttpException(`Workflow report ${workflowReportId} not found`);
    }

    private isDeletionBlocked(workflowReportId: number): boolean {
        return (this.pendingCompletionWaits.get(workflowReportId) ?? 0) > 0;
    }

    private async sleep(ms: number, signal?: AbortSignal): Promise<void> {
        this.throwIfAborted(signal);
        await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
                if (signal) signal.removeEventListener('abort', onAbort);
                resolve();
            }, ms);

            const onAbort = () => {
                clearTimeout(timer);
                if (signal) signal.removeEventListener('abort', onAbort);
                reject(this.toAbortError(signal?.reason));
            };

            if (signal) signal.addEventListener('abort', onAbort, { once: true });
        });
    }

    private throwIfAborted(signal?: AbortSignal): void {
        if (!signal?.aborted) return;
        throw this.toAbortError(signal.reason);
    }

    private toAbortError(reason: unknown): Error {
        if (reason instanceof Error) return reason;
        const abortError = new Error(typeof reason === 'string' ? reason : 'Operation aborted');
        abortError.name = 'AbortError';
        return abortError;
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
