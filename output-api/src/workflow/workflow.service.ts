import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, IsNull, LessThan, Not, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { SearchFilter, UpdateMapping } from '../../../output-interfaces/Config';
import { PublicationIndex } from '../../../output-interfaces/PublicationIndex';
import { ExportWorkflow as IExportWorkflow, ImportStrategy, ImportWorkflowTestResult, WorkflowReportItemLevel, WorkflowType } from '../../../output-interfaces/Workflow';
import { AppConfigService } from '../config/app-config.service';
import { Publication } from '../publication/core/Publication.entity';
import { validateExportWorkflow } from './export-workflow.schema';
import { JSONataExportService } from './export/jsonata-export.service';
import { ExportWorkflow } from './ExportWorkflow.entity';
import { AbstractFilterService } from './filter/abstract-filter.service';
import { validateImportWorkflow } from './import-workflow.schema';
import { JSONataImportService } from './import/jsonata-import';
import { ImportWorkflow } from './ImportWorkflow.entity';
import { WorkflowReportService } from './workflow-report.service';

@Injectable()
export class WorkflowService {
    private readonly activeExecutionKeys = new Set<string>();
    private readonly editLockOwners = new Map<string, string>();

    constructor(
        @InjectRepository(ImportWorkflow) private importRepository: Repository<ImportWorkflow>,
        @InjectRepository(ExportWorkflow) private exportRepository: Repository<ExportWorkflow>,
        private configService: AppConfigService,
        private importService: JSONataImportService,
        private exportService: JSONataExportService,
        @Inject('Filters') private filterServices: AbstractFilterService<PublicationIndex | Publication>[],
        private workflowReportService: WorkflowReportService) { }


    getImports(type?: 'draft' | 'published' | 'archived') {
        return this.importRepository.find(this.getWorkflowOptions(type));
    }

    getExports(type?: 'draft' | 'published' | 'archived') {
        return this.exportRepository.find(this.getWorkflowOptions(type));
    }

    async getImport(id?: number, lock = true, user?: string) {
        return this.getWorkflow(this.importRepository, id, WorkflowType.IMPORT, lock, user);
    }

    async getExport(id?: number, lock = true, user?: string) {
        return this.getWorkflow(this.exportRepository, id, WorkflowType.EXPORT, lock, user);
    }

    async importImport(file: Express.Multer.File) {
        let workflow: ImportWorkflow;
        try {
            workflow = JSON.parse(file.buffer.toString('utf-8'));
        } catch {
            throw new BadRequestException('invalid json');
        }

        const lastVersion = await this.importRepository.findOne({ where: { workflow_id: workflow.workflow_id }, order: { version: 'DESC' } })
        const nextVersion = lastVersion ? lastVersion.version + 1 : 1;

        const obj: ImportWorkflow = {
            workflow_id: workflow.workflow_id,
            label: workflow.label,
            version: nextVersion,
            description: workflow.description,
            strategy_type: workflow.strategy_type,
            strategy: workflow.strategy,
            mapping: workflow.mapping,
            update_config: workflow.update_config
        }

        return this.saveImport(obj);
    }

    async saveImport(workflow: ImportWorkflow, user?: string) {
        let toSave = workflow;
        let shouldDeleteArchivedWorkflowReports = false;
        if (workflow.id) { //update
            const db = await this.importRepository.findOneBy({ id: workflow.id })
            if (!db) throw new BadRequestException("Error: ID of workflow to update does not exist");
            await this.ensureDraftWorkflowCanBeSaved(db, workflow, WorkflowType.IMPORT, user);
            const nextLockedAt = this.resolveNextLockState(db.locked_at, workflow.locked_at);
            if (db.published_at) {
                const isArchiving = !!workflow.deleted_at; // optional: plus equality checks
                if (!isArchiving) throw new BadRequestException("Error: workflow to update has already been published");
                toSave = { ...db, workflow_id: db.workflow_id, version: db.version, deleted_at: new Date(), locked_at: nextLockedAt };
                shouldDeleteArchivedWorkflowReports = !db.deleted_at;
            } else if (!db.published_at && workflow.published_at) {
                //does another published version exist?
                const other = await this.importRepository.findOneBy({ workflow_id: db.workflow_id, published_at: Not(IsNull()), id: Not(workflow.id) })
                if (other) throw new BadRequestException("Error: there is already a published version of this workflow. Archive it first.");
                else toSave = { ...db, workflow_id: db.workflow_id, version: db.version, published_at: new Date(), locked_at: nextLockedAt }
            } else {
                toSave = { ...db, ...workflow, workflow_id: db.workflow_id, version: db.version, locked_at: nextLockedAt };
            }
        } else {
            toSave = {
                ...toSave,
                workflow_id: workflow.workflow_id ?? uuidv4(),
                version: workflow.version ?? 1,
                id: undefined,
                created_at: undefined,
                published_at: undefined,
                deleted_at: undefined,
                modified_at: undefined,
                locked_at: undefined,
                update_config: workflow.update_config ?? this.importService.getUpdateMapping()
            }
        }
        const validated = validateImportWorkflow(toSave);
        if (!validated) return;

        const saved = await this.importRepository.save(toSave);
        this.syncEditLockOwner(saved, WorkflowType.IMPORT, user);
        if (shouldDeleteArchivedWorkflowReports && saved.id) {
            await this.workflowReportService.deleteReportsForWorkflow(saved.id);
        }

        return saved;
    }

    async importExport(file: Express.Multer.File) {
        let workflow: IExportWorkflow;
        try {
            workflow = JSON.parse(file.buffer.toString('utf-8'));
        } catch {
            throw new BadRequestException('invalid json');
        }

        const lastVersion = await this.exportRepository.findOne({ where: { workflow_id: workflow.workflow_id }, order: { version: 'DESC' } });
        const nextVersion = lastVersion ? lastVersion.version + 1 : 1;

        const obj: ExportWorkflow = {
            workflow_id: workflow.workflow_id,
            label: workflow.label,
            version: nextVersion,
            description: workflow.description,
            strategy_type: workflow.strategy_type,
            strategy: workflow.strategy,
            mapping: workflow.mapping,
        };

        return this.saveExport(obj);
    }

    async saveExport(workflow: ExportWorkflow, user?: string) {
        let toSave = workflow;
        let shouldDeleteArchivedWorkflowReports = false;
        if (workflow.id) {
            const db = await this.exportRepository.findOneBy({ id: workflow.id });
            if (!db) throw new BadRequestException("Error: ID of workflow to update does not exist");
            await this.ensureDraftWorkflowCanBeSaved(db, workflow, WorkflowType.EXPORT, user);
            const nextLockedAt = this.resolveNextLockState(db.locked_at, workflow.locked_at);
            if (db.published_at) {
                const isArchiving = !!workflow.deleted_at;
                if (!isArchiving) throw new BadRequestException("Error: workflow to update has already been published");
                toSave = { ...db, workflow_id: db.workflow_id, version: db.version, deleted_at: new Date(), locked_at: nextLockedAt };
                shouldDeleteArchivedWorkflowReports = !db.deleted_at;
            } else if (!db.published_at && workflow.published_at) {
                const other = await this.exportRepository.findOneBy({ workflow_id: db.workflow_id, published_at: Not(IsNull()), id: Not(workflow.id) });
                if (other) throw new BadRequestException("Error: there is already a published version of this workflow. Archive it first.");
                else toSave = { ...db, workflow_id: db.workflow_id, version: db.version, published_at: new Date(), locked_at: nextLockedAt };
            } else {
                toSave = { ...db, ...workflow, workflow_id: db.workflow_id, version: db.version, locked_at: nextLockedAt };
            }
        } else {
            toSave = {
                ...toSave,
                workflow_id: workflow.workflow_id ?? uuidv4(),
                version: workflow.version ?? 1,
                strategy_type: workflow.strategy_type,
                id: undefined,
                created_at: undefined,
                published_at: undefined,
                deleted_at: undefined,
                modified_at: undefined,
                locked_at: undefined,
            };
        }

        toSave = validateExportWorkflow(toSave);

        const saved = await this.exportRepository.save(toSave);
        this.syncEditLockOwner(saved, WorkflowType.EXPORT, user);
        if (shouldDeleteArchivedWorkflowReports && saved.id) {
            await this.workflowReportService.deleteReportsForWorkflow(saved.id, WorkflowType.EXPORT);
        }
        return saved;
    }

    async startImport(id: number, reporting_year: number, ids: number[], file: Express.Multer.File, update: boolean, user?: string, dryRun = false) {
        return this.startDetachedExecution('workflow-import-service', async () => {
            const importDef = await this.importRepository.findOneBy({ id });

            if (!importDef) throw new BadRequestException('Error: workflow not found');
            if (!importDef.published_at || importDef.deleted_at) {
                throw new BadRequestException('Error: only published workflows can be executed');
            }
            if (importDef.strategy_type === ImportStrategy.URL_QUERY_OFFSET) {
                await this.importService.setReportingYear(reporting_year + "");
                await this.importService.setUp(importDef, update ? importDef.update_config : undefined);
                const reportId = this.getImportExecutionReportId();
                await this.importService.import(update, user, dryRun);
                return { completion: this.waitForImportCompletionOrWatchdog(reportId) };
            } else if (importDef.strategy_type === ImportStrategy.URL_LOOKUP_AND_RETRIEVE) {
                await this.importService.setReportingYear(reporting_year + "");
                await this.importService.setUp(importDef, update ? importDef.update_config : undefined);
                const reportId = this.getImportExecutionReportId();
                await this.importService.importLookupAndRetrieve(update, user, dryRun);
                return { completion: this.waitForImportCompletionOrWatchdog(reportId) };
            } else if (importDef.strategy_type === ImportStrategy.URL_DOI) {
                await this.importService.setUp(importDef, importDef.update_config);
                const reportId = this.getImportExecutionReportId();
                if (ids && ids.length > 0) {
                    this.importService.enrich_whereClause = { where: { id: In(ids) } };
                } else if (reporting_year) {
                    const beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
                    const endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
                    this.importService.enrich_whereClause = { where: { pub_date: Between(beginDate, endDate) } };
                    this.importService.setReportingYear(reporting_year + "")
                } else throw new BadRequestException('neither reporting_year nor ids are given')
                await this.importService.enrich(user, dryRun);
                return { completion: this.waitForImportCompletionOrWatchdog(reportId) };
            } else if (importDef.strategy_type === ImportStrategy.FILE_UPLOAD) {
                await this.importService.setUp(importDef, importDef.update_config);
                const reportId = this.getImportExecutionReportId();
                if (file) await this.importService.loadFile(update, file, user, dryRun);
                else throw new BadRequestException('no file supported')
                return { completion: this.waitForImportCompletionOrWatchdog(reportId) };
            }

            return {};
        });
    }

    async testImport(id: number, pos = 1): Promise<ImportWorkflowTestResult> {
        return this.runExclusive('workflow-import-service', async () => {
            const importDef = await this.importRepository.findOneBy({ id });
            if (!importDef) throw new NotFoundException();

            await this.importService.setReportingYear("2024");
            await this.importService.setUp(importDef, importDef.update_config);
            return await this.importService.test(pos);
        });
    }

    async startExport(id: number, filter?: { filter: SearchFilter, paths: string[] }, user?: string, withMasterData?: boolean) {
        return this.runExclusive('workflow-export-service', async () => {
            const exportDef = await this.exportRepository.findOneBy({ id });

            if (!exportDef) throw new BadRequestException('Error: workflow not found');
            if (exportDef.deleted_at) {
                throw new BadRequestException('Error: archived workflows cannot be executed');
            }

            await this.exportService.setUp(exportDef);
            return this.exportService.export(filter, this.filterServices, user, withMasterData);
        });
    }

    async isLocked(id: number): Promise<boolean> {
        return this.isWorkflowLocked(this.importRepository, id);
    }

    async isExportLocked(id: number): Promise<boolean> {
        return this.isWorkflowLocked(this.exportRepository, id);
    }

    async deleteImports(ids: number[]) {
        const workflows = await this.importRepository.findBy(ids.map(id => ({ id })) as never);
        if (workflows.length !== ids.length) {
            throw new BadRequestException('Error: at least one workflow ID does not exist');
        }
        if (workflows.some((workflow) => !!workflow.published_at || !!workflow.deleted_at)) {
            throw new BadRequestException('Error: only draft workflows can be deleted');
        }

        await Promise.all(workflows
            .map((workflow) => workflow.id)
            .filter((id): id is number => !!id)
            .map((id) => this.workflowReportService.deleteReportsForWorkflow(id, WorkflowType.IMPORT)));
        workflows.forEach((workflow) => {
            if (workflow.id) this.releaseEditLock(WorkflowType.IMPORT, workflow.id);
        });

        return this.importRepository.remove(workflows);
    }

    async deleteExports(ids: number[]) {
        const workflows = await this.exportRepository.findBy(ids.map(id => ({ id })) as never);
        if (workflows.length !== ids.length) {
            throw new BadRequestException('Error: at least one workflow ID does not exist');
        }
        if (workflows.some((workflow) => !!workflow.published_at || !!workflow.deleted_at)) {
            throw new BadRequestException('Error: only draft workflows can be deleted');
        }

        await Promise.all(workflows
            .map((workflow) => workflow.id)
            .filter((id): id is number => !!id)
            .map((id) => this.workflowReportService.deleteReportsForWorkflow(id, WorkflowType.EXPORT)));
        workflows.forEach((workflow) => {
            if (workflow.id) this.releaseEditLock(WorkflowType.EXPORT, workflow.id);
        });

        return this.exportRepository.remove(workflows);
    }

    async status(_id: number) {
        return this.workflowReportService.getStatusForWorkflow(_id, WorkflowType.IMPORT);
    }

    async exportStatus(_id: number) {
        return this.workflowReportService.getStatusForWorkflow(_id, WorkflowType.EXPORT);
    }

    getUpdateMapping(id: number) {
        return this.importRepository.findOneBy({ id }).then(w => w.update_config).catch(err => {
            throw new NotFoundException(err.message);
        });
    }

    async setUpdateMapping(id: number, mapping: UpdateMapping) {
        const w = await this.importRepository.findOneBy({ id });
        if (!w) throw new NotFoundException();
        return this.importRepository.save({ id, update_config: mapping })
    }

    private getWorkflowOptions(type?: 'draft' | 'published' | 'archived') {
        let options = {};
        if (type === 'draft') options = { where: { published_at: IsNull(), deleted_at: IsNull() } };
        else if (type === 'published') options = { where: { published_at: Not(IsNull()), deleted_at: IsNull() } };
        else if (type === 'archived') options = { where: { deleted_at: Not(IsNull()) }, withDeleted: true };
        return options;
    }

    private async getWorkflow<T extends { id?: number; published_at?: Date | null; deleted_at?: Date | null; locked_at?: Date | null }>(
        repository: Repository<T>,
        id: number,
        workflowType: WorkflowType,
        lock = true,
        user?: string,
    ) {
        const res = await repository.findOne({ where: { id } as never, withDeleted: true });
        if (!res) throw new NotFoundException();
        if (!lock || res.published_at || res.deleted_at) return res;

        const timeoutMs = await this.getLockTimeoutMs();
        const now = new Date();
        const isExpired = !!res.locked_at && (now.getTime() - res.locked_at.getTime()) > timeoutMs;
        const lockKey = this.getEditLockKey(workflowType, res.id);

        if (res.locked_at && !isExpired) {
            if (user && this.editLockOwners.get(lockKey) === user) {
                return {
                    ...res,
                    locked_at: undefined,
                };
            }
            throw new ConflictException('Workflow is currently locked.');
        }

        const lockCriteria = !res.locked_at
            ? { id: res.id, published_at: IsNull(), deleted_at: IsNull(), locked_at: IsNull() }
            : { id: res.id, published_at: IsNull(), deleted_at: IsNull(), locked_at: LessThan(new Date(now.getTime() - timeoutMs)) };

        const updateResult = await repository.update(lockCriteria as never, { locked_at: now } as never);
        if (!updateResult.affected) {
            throw new ConflictException('Workflow is currently locked.');
        }
        if (user && res.id) {
            this.editLockOwners.set(lockKey, user);
        }

        return {
            ...res,
            locked_at: undefined,
        };
    }

    private async isWorkflowLocked<T extends { locked_at?: Date; deleted_at?: Date }>(repository: Repository<T>, id: number): Promise<boolean> {
        const db = await repository.findOne({ where: { id } as never, withDeleted: true });
        if (!db) throw new NotFoundException();
        if (!db.locked_at || db.deleted_at) return false;
        else if ((new Date().getTime() - db.locked_at.getTime()) > await this.getLockTimeoutMs()) return false;
        else return true;
    }

    private async runExclusive<T>(key: string, action: () => Promise<T>): Promise<T> {
        this.ensureExecutionIsAvailable(key);
        this.activeExecutionKeys.add(key);
        try {
            return await action();
        } finally {
            this.activeExecutionKeys.delete(key);
        }
    }

    private async startDetachedExecution(key: string, action: () => Promise<{ completion?: Promise<unknown> | void }>): Promise<void> {
        this.ensureExecutionIsAvailable(key);
        this.activeExecutionKeys.add(key);
        try {
            const { completion } = await action();
            void Promise.resolve(completion)
                .catch(() => undefined)
                .finally(() => {
                    this.activeExecutionKeys.delete(key);
                });
        } catch (error) {
            this.activeExecutionKeys.delete(key);
            throw error;
        }
    }

    private ensureExecutionIsAvailable(key: string) {
        if (this.activeExecutionKeys.has(key)) {
            throw new ConflictException('A workflow execution is already running for this service.');
        }
    }

    private async waitForImportCompletionOrWatchdog(reportId: number): Promise<void> {
        const timeoutMs = await this.getImportWatchdogTimeoutMs();
        let timeoutReached = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const abortController = new AbortController();

        const watchdogPromise = new Promise<void>((resolve) => {
            timer = setTimeout(() => {
                timeoutReached = true;
                abortController.abort('workflow-import-watchdog-timeout');
                void this.writeImportWatchdogWarning(reportId, timeoutMs).finally(resolve);
            }, timeoutMs);
        });

        const completionPromise = this.workflowReportService
            .waitForCompletion(reportId, 500, { allowStale: false, signal: abortController.signal })
            .then(() => undefined)
            .catch((error) => {
                if (this.isAbortError(error)) return;
                throw error;
            });

        try {
            await Promise.race([
                completionPromise,
                watchdogPromise,
            ]);
        } finally {
            if (!timeoutReached && timer) {
                clearTimeout(timer);
                abortController.abort('workflow-import-completed');
            }
        }
    }

    private async writeImportWatchdogWarning(reportId: number, timeoutMs: number): Promise<void> {
        const timeoutMinutes = Math.round(timeoutMs / 60000);
        try {
            await this.workflowReportService.write(reportId, {
                level: WorkflowReportItemLevel.WARNING,
                timestamp: new Date(),
                code: 'workflow-import-watchdog',
                message: `Import watchdog timeout reached after ${timeoutMinutes} minute(s); lock released while run may still be active.`,
            });
        } catch {
            return;
        }
    }

    private async getImportWatchdogTimeoutMs(): Promise<number> {
        const timeoutInMinutes = Number(await this.configService.get('workflow_import_watchdog_timeout'));
        const resolvedMinutes = Number.isFinite(timeoutInMinutes) && timeoutInMinutes >= 1 ? timeoutInMinutes : 60;
        return resolvedMinutes * 60 * 1000;
    }

    private async getLockTimeoutMs(): Promise<number> {
        const timeoutInMinutes = Number(await this.configService.get('lock_timeout'));
        const resolvedMinutes = Number.isFinite(timeoutInMinutes) && timeoutInMinutes >= 0 ? timeoutInMinutes : 5;
        return resolvedMinutes * 60 * 1000;
    }

    private async ensureDraftWorkflowCanBeSaved<T extends { id?: number; published_at?: Date | null; deleted_at?: Date | null; locked_at?: Date | null }>(
        db: T,
        workflow: T,
        workflowType: WorkflowType,
        user?: string,
    ): Promise<void> {
        if (db.published_at || db.deleted_at || !db.id) return;

        if (this.isUnlockOnlyRequest(workflow)) {
            this.releaseEditLock(workflowType, db.id);
            return;
        }

        if (!db.locked_at) {
            this.releaseEditLock(workflowType, db.id);
            return;
        }

        const timeoutMs = await this.getLockTimeoutMs();
        if ((Date.now() - db.locked_at.getTime()) > timeoutMs) {
            this.releaseEditLock(workflowType, db.id);
            return;
        }

        const owner = this.editLockOwners.get(this.getEditLockKey(workflowType, db.id));
        if (!user || owner !== user) {
            throw new ConflictException('Workflow is currently locked.');
        }
    }

    private isUnlockOnlyRequest<T extends { id?: number; locked_at?: Date | null }>(workflow: T): boolean {
        return !!workflow?.id
            && workflow.locked_at === null
            && Object.keys(workflow).every((key) => key === 'id' || key === 'locked_at');
    }

    private syncEditLockOwner<T extends { id?: number; locked_at?: Date | null; published_at?: Date | null; deleted_at?: Date | null }>(
        workflow: T,
        workflowType: WorkflowType,
        user?: string,
    ): void {
        if (!workflow.id) return;
        if (!workflow.locked_at || workflow.published_at || workflow.deleted_at) {
            this.releaseEditLock(workflowType, workflow.id);
            return;
        }
        if (user) {
            this.editLockOwners.set(this.getEditLockKey(workflowType, workflow.id), user);
        }
    }

    private resolveNextLockState(currentLockedAt?: Date | null, requestedLockedAt?: Date | null): Date | null {
        if (requestedLockedAt === null) return null;
        if (requestedLockedAt instanceof Date) return requestedLockedAt;
        return currentLockedAt ?? null;
    }

    private releaseEditLock(workflowType: WorkflowType, workflowId: number): void {
        this.editLockOwners.delete(this.getEditLockKey(workflowType, workflowId));
    }

    private getEditLockKey(workflowType: WorkflowType, workflowId?: number): string {
        return `${workflowType}:${workflowId ?? 'unknown'}`;
    }

    private isAbortError(error: unknown): boolean {
        return error instanceof Error && error.name === 'AbortError';
    }

    private getImportExecutionReportId(): number {
        const reportId = this.importService.getCurrentWorkflowReportId();
        if (!reportId) throw new NotFoundException('Workflow report not initialized');
        return reportId;
    }
}
