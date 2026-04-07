import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, IsNull, LessThan, Not, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { SearchFilter, UpdateMapping } from '../../../output-interfaces/Config';
import { PublicationIndex } from '../../../output-interfaces/PublicationIndex';
import { ExportWorkflow as IExportWorkflow, ImportStrategy, ImportWorkflowTestResult, Workflow, WorkflowReportItemLevel, WorkflowType } from '../../../output-interfaces/Workflow';
import { EditLockOwnerStore } from '../common/edit-lock';
import { AppConfigService } from '../config/app-config.service';
import { Publication } from '../publication/core/Publication.entity';
import { validateExportWorkflow } from './export-workflow.schema';
import { JSONataExportService } from './export/jsonata-export.service';
import { ExportWorkflow } from './ExportWorkflow.entity';
import { AbstractFilterService } from './filter/abstract-filter.service';
import { validateImportWorkflow } from './import-workflow.schema';
import { JSONataImportService } from './import/jsonata-import';
import { ImportWorkflow } from './ImportWorkflow.entity';
import { validateValidationWorkflow } from './validation-workflow.schema';
import { ValidationService } from './validation.service';
import { ValidationWorkflow } from './ValidationWorkflow.entity';
import { WorkflowReportService } from './workflow-report.service';
import { hasProvidedEntityId } from '../common/entity-id';
import { createEntityLockedHttpException, createWorkflowRunningHttpException } from '../common/api-error';

type SaveWorkflowOptions<TWorkflow extends Workflow> = {
    repository: Repository<TWorkflow>;
    workflowType: WorkflowType;
    validate?: (workflow: TWorkflow) => TWorkflow | Promise<TWorkflow>;
    createDefaults?: (workflow: TWorkflow) => Partial<TWorkflow> | Promise<Partial<TWorkflow>>;
    ensureCanPublish?: (workflow: TWorkflow) => void | Promise<void>;
    reportWorkflowType?: WorkflowType;
};

type DeleteWorkflowOptions<TWorkflow extends Workflow> = {
    repository: Repository<TWorkflow>;
    workflowType: WorkflowType;
    reportWorkflowType?: WorkflowType;
};

@Injectable()
export class WorkflowService {
    private readonly activeExecutionKeys = new Set<string>();

    constructor(
        @InjectRepository(ImportWorkflow) private importRepository: Repository<ImportWorkflow>,
        @InjectRepository(ExportWorkflow) private exportRepository: Repository<ExportWorkflow>,
        @InjectRepository(ValidationWorkflow) private validationRepository: Repository<ValidationWorkflow>,
        private configService: AppConfigService,
        private importService: JSONataImportService,
        private exportService: JSONataExportService,
        private validationService: ValidationService,
        @Inject('Filters') private filterServices: AbstractFilterService<PublicationIndex | Publication>[],
        private workflowReportService: WorkflowReportService) { }


    getImports(type?: 'draft' | 'published' | 'archived') {
        return this.importRepository.find(this.getWorkflowOptions(type));
    }

    getExports(type?: 'draft' | 'published' | 'archived') {
        return this.exportRepository.find(this.getWorkflowOptions(type));
    }

    getValidations(type?: 'draft' | 'published' | 'archived') {
        return this.validationRepository.find(this.getWorkflowOptions(type));
    }

    async getImport(id?: number, lock = true, user?: string) {
        return this.getWorkflow(this.importRepository, id, WorkflowType.IMPORT, lock, user);
    }

    async getExport(id?: number, lock = true, user?: string) {
        return this.getWorkflow(this.exportRepository, id, WorkflowType.EXPORT, lock, user);
    }

    async getValidation(id?: number, lock = true, user?: string) {
        return this.getWorkflow(this.validationRepository, id, WorkflowType.VALIDATION, lock, user);
    }

    async importImport(file: Express.Multer.File) {
        let workflow: ImportWorkflow;
        try {
            workflow = JSON.parse(file.buffer.toString('utf-8'));
        } catch {
            throw new BadRequestException('invalid json');
        }

        const nextVersion = await this.getNextDraftVersion(this.importRepository, workflow.workflow_id);

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
        return this.saveWorkflow(workflow, user, {
            repository: this.importRepository,
            workflowType: WorkflowType.IMPORT,
            validate: validateImportWorkflow,
            createDefaults: (draft) => ({
                update_config: draft.update_config ?? this.importService.getUpdateMapping(),
            }),
            reportWorkflowType: WorkflowType.IMPORT,
        });
    }

    async importExport(file: Express.Multer.File) {
        let workflow: IExportWorkflow;
        try {
            workflow = JSON.parse(file.buffer.toString('utf-8'));
        } catch {
            throw new BadRequestException('invalid json');
        }

        const nextVersion = await this.getNextDraftVersion(this.exportRepository, workflow.workflow_id);

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
        return this.saveWorkflow(workflow, user, {
            repository: this.exportRepository,
            workflowType: WorkflowType.EXPORT,
            validate: validateExportWorkflow,
            createDefaults: (draft) => ({
                strategy_type: draft.strategy_type,
            }),
            reportWorkflowType: WorkflowType.EXPORT,
        });
    }

    async saveValidation(workflow: ValidationWorkflow, user?: string) {
        return this.saveWorkflow(workflow, user, {
            repository: this.validationRepository,
            workflowType: WorkflowType.VALIDATION,
            validate: (draft) => {
                const validated = validateValidationWorkflow(draft);
                if (validated.published_at && !validated.rules?.length) {
                    throw new BadRequestException('Error: validation workflow must define at least one rule before publication');
                }
                return validated;
            },
            createDefaults: (draft) => ({
                rules: draft.rules ?? [],
            }),
            ensureCanPublish: (draft) => {
                if (draft.rules?.length) return;
                throw new BadRequestException('Error: validation workflows must define at least one rule before publishing');
            },
            reportWorkflowType: WorkflowType.VALIDATION,
        });
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

    async startValidation(id: number, user?: string) {
        return this.startDetachedExecution('workflow-validation-service', async () => {
            const validationDef = await this.validationRepository.findOneBy({ id });

            if (!validationDef) throw new BadRequestException('Error: workflow not found');
            if (validationDef.deleted_at) {
                throw new BadRequestException('Error: archived workflows cannot be executed');
            }

            await this.validationService.setUp(validationDef);
            return {
                completion: this.validationService.validate(user).catch(() => undefined),
            };
        });
    }

    async isLocked(id: number): Promise<boolean> {
        return this.isWorkflowLocked(this.importRepository, id);
    }

    async isExportLocked(id: number): Promise<boolean> {
        return this.isWorkflowLocked(this.exportRepository, id);
    }

    async isValidationLocked(id: number): Promise<boolean> {
        return this.isWorkflowLocked(this.validationRepository, id);
    }

    async deleteImports(ids: number[]) {
        return this.deleteWorkflows(ids, {
            repository: this.importRepository,
            workflowType: WorkflowType.IMPORT,
            reportWorkflowType: WorkflowType.IMPORT,
        });
    }

    async deleteExports(ids: number[]) {
        return this.deleteWorkflows(ids, {
            repository: this.exportRepository,
            workflowType: WorkflowType.EXPORT,
            reportWorkflowType: WorkflowType.EXPORT,
        });
    }

    async deleteValidations(ids: number[]) {
        return this.deleteWorkflows(ids, {
            repository: this.validationRepository,
            workflowType: WorkflowType.VALIDATION,
            reportWorkflowType: WorkflowType.VALIDATION,
        });
    }

    async status(_id: number) {
        return this.workflowReportService.getStatusForWorkflow(_id, WorkflowType.IMPORT);
    }

    async exportStatus(_id: number) {
        return this.workflowReportService.getStatusForWorkflow(_id, WorkflowType.EXPORT);
    }

    async validationStatus(_id: number) {
        return this.workflowReportService.getStatusForWorkflow(_id, WorkflowType.VALIDATION);
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
        if (res.locked_at && !isExpired) {
            if (user && EditLockOwnerStore.getOwner(workflowType, res.id) === user) {
                return {
                    ...res,
                    locked_at: undefined,
                };
            }
            throw createEntityLockedHttpException('Workflow is currently locked.');
        }

        const lockCriteria = !res.locked_at
            ? { id: res.id, published_at: IsNull(), deleted_at: IsNull(), locked_at: IsNull() }
            : { id: res.id, published_at: IsNull(), deleted_at: IsNull(), locked_at: LessThan(new Date(now.getTime() - timeoutMs)) };

        const updateResult = await repository.update(lockCriteria as never, { locked_at: now } as never);
        if (!updateResult.affected) {
            throw createEntityLockedHttpException('Workflow is currently locked.');
        }
        if (user && hasProvidedEntityId(res.id)) {
            EditLockOwnerStore.setOwner(workflowType, res.id, user);
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
            throw createWorkflowRunningHttpException();
        }
    }

    private async waitForImportCompletionOrWatchdog(reportId: number): Promise<void> {
        this.workflowReportService.registerCompletionWait(reportId);
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
            this.workflowReportService.releaseCompletionWait(reportId);
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
        if (db.published_at || db.deleted_at || !hasProvidedEntityId(db.id)) return;

        if (!db.locked_at) {
            this.releaseEditLock(workflowType, db.id);
            return;
        }

        const timeoutMs = await this.getLockTimeoutMs();
        if ((Date.now() - db.locked_at.getTime()) > timeoutMs) {
            this.releaseEditLock(workflowType, db.id);
            return;
        }

        const owner = EditLockOwnerStore.getOwner(workflowType, db.id);
        if (this.isUnlockOnlyRequest(workflow)) {
            if (user && owner === user) {
                this.releaseEditLock(workflowType, db.id);
                return;
            }
            throw createEntityLockedHttpException('Workflow is currently locked.');
        }

        if (!user || owner !== user) {
            throw createEntityLockedHttpException('Workflow is currently locked.');
        }
    }

    private isUnlockOnlyRequest<T extends { id?: number; locked_at?: Date | null }>(workflow: T): boolean {
        return hasProvidedEntityId(workflow?.id)
            && workflow.locked_at === null
            && Object.keys(workflow).every((key) => key === 'id' || key === 'locked_at');
    }

    private syncEditLockOwner<T extends { id?: number; locked_at?: Date | null; published_at?: Date | null; deleted_at?: Date | null }>(
        workflow: T,
        workflowType: WorkflowType,
        user?: string,
    ): void {
        if (!hasProvidedEntityId(workflow.id)) return;
        if (!workflow.locked_at || workflow.published_at || workflow.deleted_at) {
            this.releaseEditLock(workflowType, workflow.id);
            return;
        }
        if (user) {
            EditLockOwnerStore.setOwner(workflowType, workflow.id, user);
        }
    }

    private resolveNextLockState(currentLockedAt?: Date | null, requestedLockedAt?: Date | null): Date | null {
        if (requestedLockedAt === null) return null;
        if (requestedLockedAt instanceof Date) return requestedLockedAt;
        return currentLockedAt ?? null;
    }

    private releaseEditLock(workflowType: WorkflowType, workflowId: number): void {
        EditLockOwnerStore.release(workflowType, workflowId);
    }

    private async saveWorkflow<TWorkflow extends Workflow>(
        workflow: TWorkflow,
        user: string | undefined,
        options: SaveWorkflowOptions<TWorkflow>,
    ): Promise<TWorkflow> {
        let toSave = workflow;
        let shouldDeleteArchivedWorkflowReports = false;

        if (hasProvidedEntityId(workflow.id)) {
            const db = await options.repository.findOneBy({ id: workflow.id } as never);
            if (!db) throw new BadRequestException("Error: ID of workflow to update does not exist");
            await this.ensureDraftWorkflowCanBeSaved(db, workflow, options.workflowType, user);
            const nextLockedAt = this.resolveNextLockState(db.locked_at, workflow.locked_at);

            if (db.published_at) {
                const isArchiving = !!workflow.deleted_at;
                if (!isArchiving) throw new BadRequestException("Error: workflow to update has already been published");
                toSave = { ...db, workflow_id: db.workflow_id, version: db.version, deleted_at: new Date(), locked_at: nextLockedAt };
                shouldDeleteArchivedWorkflowReports = !db.deleted_at;
            } else if (!db.published_at && workflow.published_at) {
                const other = await options.repository.findOneBy({
                    workflow_id: db.workflow_id,
                    published_at: Not(IsNull()),
                    id: Not(workflow.id),
                } as never);
                if (other) throw new BadRequestException("Error: there is already a published version of this workflow. Archive it first.");
                toSave = { ...db, workflow_id: db.workflow_id, version: db.version, published_at: new Date(), locked_at: nextLockedAt };
                if (options.ensureCanPublish) {
                    await options.ensureCanPublish(toSave);
                }
            } else {
                toSave = { ...db, ...workflow, workflow_id: db.workflow_id, version: db.version, locked_at: nextLockedAt };
            }
        } else {
            const workflowId = workflow.workflow_id ?? uuidv4();
            const createDefaults = options.createDefaults ? await options.createDefaults(workflow) : {};
            toSave = {
                ...toSave,
                ...createDefaults,
                workflow_id: workflowId,
                version: await this.getNextDraftVersion(options.repository, workflowId),
                id: undefined,
                created_at: undefined,
                published_at: undefined,
                deleted_at: undefined,
                modified_at: undefined,
                locked_at: undefined,
            };
        }

        if (options.validate) {
            toSave = await options.validate(toSave);
        }

        const saved = await options.repository.save(toSave);
        this.syncEditLockOwner(saved, options.workflowType, user);
        if (shouldDeleteArchivedWorkflowReports && hasProvidedEntityId(saved.id) && options.reportWorkflowType) {
            await this.workflowReportService.deleteReportsForWorkflow(saved.id, options.reportWorkflowType);
        }

        return saved;
    }

    private async deleteWorkflows<TWorkflow extends Workflow>(
        ids: number[],
        options: DeleteWorkflowOptions<TWorkflow>,
    ): Promise<TWorkflow[]> {
        const workflows = await options.repository.findBy(ids.map((id) => ({ id })) as never);
        if (workflows.length !== ids.length) {
            throw new BadRequestException('Error: at least one workflow ID does not exist');
        }
        if (workflows.some((workflow) => !!workflow.published_at || !!workflow.deleted_at)) {
            throw new BadRequestException('Error: only draft workflows can be deleted');
        }

        if (options.reportWorkflowType) {
            await Promise.all(workflows
                .map((workflow) => workflow.id)
                .filter((id): id is number => hasProvidedEntityId(id))
                .map((id) => this.workflowReportService.deleteReportsForWorkflow(id, options.reportWorkflowType!)));
        }

        workflows.forEach((workflow) => {
            if (hasProvidedEntityId(workflow.id)) this.releaseEditLock(options.workflowType, workflow.id);
        });

        return options.repository.remove(workflows);
    }

    private isAbortError(error: unknown): boolean {
        return error instanceof Error && error.name === 'AbortError';
    }

    private getImportExecutionReportId(): number {
        const reportId = this.importService.getCurrentWorkflowReportId();
        if (!reportId) throw new NotFoundException('Workflow report not initialized');
        return reportId;
    }

    private async getNextDraftVersion<T extends { workflow_id?: string; version?: number }>(
        repository: Repository<T>,
        workflowId?: string,
    ): Promise<number> {
        if (!workflowId) return 1;

        const latestWorkflow = await repository.findOne({
            where: { workflow_id: workflowId } as never,
            order: { version: 'DESC' } as never,
            withDeleted: true,
        });

        return latestWorkflow?.version ? latestWorkflow.version + 1 : 1;
    }
}
