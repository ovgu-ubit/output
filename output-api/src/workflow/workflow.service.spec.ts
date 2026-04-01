import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ExportStrategy, ImportStrategy, WorkflowReportItemLevel, WorkflowType } from '../../../output-interfaces/Workflow';
import { EditLockOwnerStore } from '../common/edit-lock';
import { AppConfigService } from '../config/app-config.service';
import { ExportWorkflow } from './ExportWorkflow.entity';
import { JSONataExportService } from './export/jsonata-export.service';
import { ImportWorkflow } from './ImportWorkflow.entity';
import { JSONataImportService } from './import/jsonata-import';
import { ValidationService } from './validation.service';
import { ValidationWorkflow } from './ValidationWorkflow.entity';
import { WorkflowReportService } from './workflow-report.service';
import { WorkflowService } from './workflow.service';

jest.mock('uuid', () => ({
    v4: jest.fn(() => 'test-uuid'),
}));

describe('WorkflowService', () => {
    let service: WorkflowService;
    let importRepository: jest.Mocked<Partial<Repository<ImportWorkflow>>>;
    let exportRepository: jest.Mocked<Partial<Repository<ExportWorkflow>>>;
    let validationRepository: jest.Mocked<Partial<Repository<ValidationWorkflow>>>;
    let workflowReportService: {
        deleteReportsForWorkflow: jest.Mock;
        getStatusForWorkflow: jest.Mock;
        registerCompletionWait: jest.Mock;
        releaseCompletionWait: jest.Mock;
        waitForCompletion: jest.Mock;
        write: jest.Mock;
    };
    let configService: { get: jest.Mock };
    let exportService: {
        setUp: jest.Mock;
        export: jest.Mock;
        status: jest.Mock;
    };
    let validationService: {
        setUp: jest.Mock;
        validate: jest.Mock;
        getCurrentWorkflowReportId: jest.Mock;
    };
    let importService: {
        getUpdateMapping: jest.Mock;
        setReportingYear: jest.Mock;
        setUp: jest.Mock;
        import: jest.Mock;
        importLookupAndRetrieve: jest.Mock;
        enrich: jest.Mock;
        loadFile: jest.Mock;
        test: jest.Mock;
        getCurrentWorkflowReportId: jest.Mock;
    };

    beforeEach(async () => {
        EditLockOwnerStore.clear();
        importRepository = {
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            findBy: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
        };
        exportRepository = {
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            findBy: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
        };
        validationRepository = {
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            findBy: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
        };
        workflowReportService = {
            deleteReportsForWorkflow: jest.fn(),
            getStatusForWorkflow: jest.fn(),
            registerCompletionWait: jest.fn(),
            releaseCompletionWait: jest.fn(),
            waitForCompletion: jest.fn(),
            write: jest.fn(),
        };
        configService = {
            get: jest.fn(async () => undefined),
        };
        exportService = {
            setUp: jest.fn(),
            export: jest.fn(),
            status: jest.fn(),
        };
        validationService = {
            setUp: jest.fn(),
            validate: jest.fn(),
            getCurrentWorkflowReportId: jest.fn(),
        };
        importService = {
            getUpdateMapping: jest.fn(),
            setReportingYear: jest.fn(),
            setUp: jest.fn(),
            import: jest.fn(),
            importLookupAndRetrieve: jest.fn(),
            enrich: jest.fn(),
            loadFile: jest.fn(),
            test: jest.fn(),
            getCurrentWorkflowReportId: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkflowService,
                { provide: getRepositoryToken(ImportWorkflow), useValue: importRepository },
                { provide: getRepositoryToken(ExportWorkflow), useValue: exportRepository },
                { provide: getRepositoryToken(ValidationWorkflow), useValue: validationRepository },
                { provide: AppConfigService, useValue: configService },
                { provide: JSONataImportService, useValue: importService },
                { provide: JSONataExportService, useValue: exportService },
                { provide: ValidationService, useValue: validationService },
                { provide: 'Filters', useValue: [] },
                { provide: WorkflowReportService, useValue: workflowReportService },
            ],
        }).compile();

        service = module.get(WorkflowService);
    });

    it('deletes workflow reports after archiving a published workflow', async () => {
        const publishedWorkflow = {
            id: 14,
            workflow_id: 'wf-14',
            label: 'Import',
            version: 2,
            strategy_type: ImportStrategy.FILE_UPLOAD,
            strategy: {},
            mapping: '$',
            published_at: new Date('2026-03-16T10:00:00.000Z'),
            deleted_at: null,
        } as ImportWorkflow;
        importRepository.findOneBy!.mockResolvedValue(publishedWorkflow);
        importRepository.save!.mockImplementation(async (workflow) => workflow as ImportWorkflow);
        workflowReportService.deleteReportsForWorkflow.mockResolvedValue(undefined);

        await service.saveImport({ id: 14, deleted_at: new Date('2026-03-16T11:00:00.000Z') } as ImportWorkflow);

        expect(importRepository.save).toHaveBeenCalledWith(expect.objectContaining({
            id: 14,
            deleted_at: expect.any(Date),
        }));
        expect(workflowReportService.deleteReportsForWorkflow).toHaveBeenCalledWith(14, WorkflowType.IMPORT);
    });

    it('does not delete workflow reports for non-archiving saves', async () => {
        const draftWorkflow = {
            id: 21,
            workflow_id: 'wf-21',
            label: 'Draft',
            version: 1,
            strategy_type: ImportStrategy.FILE_UPLOAD,
            strategy: {},
            mapping: '$',
            published_at: null,
            deleted_at: null,
            description: 'draft',
        } as ImportWorkflow;
        importRepository.findOneBy!.mockResolvedValue(draftWorkflow);
        importRepository.save!.mockImplementation(async (workflow) => workflow as ImportWorkflow);

        await service.saveImport({ id: 21, description: 'updated' } as ImportWorkflow);

        expect(workflowReportService.deleteReportsForWorkflow).not.toHaveBeenCalled();
    });

    it('treats import workflow id 0 as an update id instead of creating a new draft', async () => {
        importRepository.findOneBy!.mockResolvedValue(null);

        await expect(service.saveImport({ id: 0, label: 'Broken update' } as ImportWorkflow))
            .rejects.toBeInstanceOf(BadRequestException);

        expect(importRepository.findOneBy).toHaveBeenCalledWith({ id: 0 });
        expect(importRepository.save).not.toHaveBeenCalled();
    });

    it('allows saving a locked draft for the same user who acquired the lock', async () => {
        const draftWorkflow = {
            id: 22,
            workflow_id: 'wf-22',
            label: 'Draft',
            version: 3,
            strategy_type: ImportStrategy.FILE_UPLOAD,
            strategy: {},
            mapping: '$',
            locked_at: null,
            published_at: null,
            deleted_at: null,
        } as ImportWorkflow;

        importRepository.findOne!.mockResolvedValue(draftWorkflow);
        (importRepository.update as jest.Mock).mockResolvedValue({ affected: 1 });
        importRepository.findOneBy!.mockResolvedValue({
            ...draftWorkflow,
            locked_at: new Date(),
        } as ImportWorkflow);
        importRepository.save!.mockImplementation(async (workflow) => workflow as ImportWorkflow);
        configService.get.mockImplementation(async (key: string) => {
            if (key === 'lock_timeout') return 5;
            return undefined;
        });

        await service.getImport(22, true, 'alice');
        await service.saveImport({
            id: 22,
            workflow_id: 'tampered-id',
            version: 99,
            description: 'updated',
        } as ImportWorkflow, 'alice');

        expect(importRepository.save).toHaveBeenCalledWith(expect.objectContaining({
            id: 22,
            workflow_id: 'wf-22',
            version: 3,
            description: 'updated',
        }));
    });

    it('rejects saving a locked draft for another user', async () => {
        importRepository.findOneBy!.mockResolvedValue({
            id: 23,
            workflow_id: 'wf-23',
            label: 'Draft',
            version: 1,
            strategy_type: ImportStrategy.FILE_UPLOAD,
            strategy: {},
            mapping: '$',
            locked_at: new Date(),
            published_at: null,
            deleted_at: null,
        } as ImportWorkflow);
        configService.get.mockImplementation(async (key: string) => {
            if (key === 'lock_timeout') return 5;
            return undefined;
        });

        await expect(service.saveImport({ id: 23, description: 'blocked' } as ImportWorkflow, 'mallory'))
            .rejects.toBeInstanceOf(ConflictException);
        expect(importRepository.save).not.toHaveBeenCalled();
    });

    it('allows unlock-only requests for the user who owns the lock', async () => {
        const lockedAt = new Date();

        importRepository.findOneBy!.mockResolvedValue({
            id: 24,
            workflow_id: 'wf-24',
            label: 'Draft',
            version: 1,
            strategy_type: ImportStrategy.FILE_UPLOAD,
            strategy: {},
            mapping: '$',
            locked_at: lockedAt,
            published_at: null,
            deleted_at: null,
        } as ImportWorkflow);
        importRepository.findOne!.mockResolvedValue({
            id: 24,
            workflow_id: 'wf-24',
            label: 'Draft',
            version: 1,
            strategy_type: ImportStrategy.FILE_UPLOAD,
            strategy: {},
            mapping: '$',
            locked_at: null,
            published_at: null,
            deleted_at: null,
        } as ImportWorkflow);
        (importRepository.update as jest.Mock).mockResolvedValue({ affected: 1 });
        configService.get.mockImplementation(async (key: string) => {
            if (key === 'lock_timeout') return 5;
            return undefined;
        });
        importRepository.save!.mockImplementation(async (workflow) => workflow as ImportWorkflow);

        await service.getImport(24, true, 'alice');
        await expect(service.saveImport({ id: 24, locked_at: null } as ImportWorkflow, 'alice')).resolves.toBeDefined();
    });

    it('rejects unlock-only requests for another user while a draft is locked', async () => {
        importRepository.findOneBy!.mockResolvedValue({
            id: 25,
            workflow_id: 'wf-25',
            label: 'Draft',
            version: 1,
            strategy_type: ImportStrategy.FILE_UPLOAD,
            strategy: {},
            mapping: '$',
            locked_at: new Date(),
            published_at: null,
            deleted_at: null,
        } as ImportWorkflow);
        configService.get.mockImplementation(async (key: string) => {
            if (key === 'lock_timeout') return 5;
            return undefined;
        });

        await expect(service.saveImport({ id: 25, locked_at: null } as ImportWorkflow, 'mallory'))
            .rejects.toBeInstanceOf(ConflictException);
        expect(importRepository.save).not.toHaveBeenCalled();
    });

    it('checks published workflow uniqueness against the stored workflow_id', async () => {
        const draftWorkflow = {
            id: 26,
            workflow_id: 'wf-26',
            label: 'Draft',
            version: 2,
            strategy_type: ImportStrategy.FILE_UPLOAD,
            strategy: {},
            mapping: '$',
            locked_at: null,
            published_at: null,
            deleted_at: null,
        } as ImportWorkflow;

        importRepository.findOneBy!
            .mockResolvedValueOnce(draftWorkflow)
            .mockResolvedValueOnce({
                id: 99,
                workflow_id: 'wf-26',
                published_at: new Date(),
            } as ImportWorkflow);

        await expect(service.saveImport({
            id: 26,
            workflow_id: 'fake-client-id',
            published_at: new Date(),
        } as ImportWorkflow, 'alice')).rejects.toBeInstanceOf(BadRequestException);

        expect(importRepository.findOneBy).toHaveBeenNthCalledWith(2, expect.objectContaining({
            workflow_id: 'wf-26',
        }));
    });

    it('validates uploaded import workflows before persisting', async () => {
        const file = {
            buffer: Buffer.from(JSON.stringify({
                workflow_id: 'wf-invalid-import',
                label: 'Invalid import',
                strategy_type: ImportStrategy.URL_QUERY_OFFSET,
                strategy: {},
                mapping: '$',
            })),
        } as Express.Multer.File;

        importRepository.findOne!.mockResolvedValue(null);

        await expect(service.importImport(file)).rejects.toBeInstanceOf(BadRequestException);
        expect(importRepository.save).not.toHaveBeenCalled();
    });

    it('validates uploaded export workflows before persisting', async () => {
        const file = {
            buffer: Buffer.from(JSON.stringify({
                workflow_id: 'wf-invalid-export',
                label: 'Invalid export',
                strategy_type: ExportStrategy.HTTP_RESPONSE,
                strategy: {
                    format: 'xml',
                    disposition: 'inline',
                    root_name: 'items',
                },
                mapping: '$',
            })),
        } as Express.Multer.File;

        exportRepository.findOne!.mockResolvedValue(null);

        await expect(service.importExport(file)).rejects.toBeInstanceOf(BadRequestException);
        expect(exportRepository.save).not.toHaveBeenCalled();
    });

    it('assigns the next persisted import version when creating a draft', async () => {
        importRepository.findOne!.mockResolvedValue({
            id: 26,
            workflow_id: 'wf-26',
            version: 4,
        } as ImportWorkflow);
        importRepository.save!.mockImplementation(async (workflow) => workflow as ImportWorkflow);

        const saved = await service.saveImport({
            workflow_id: 'wf-26',
            label: 'Draft import',
            mapping: '$',
        } as ImportWorkflow);

        expect(importRepository.save).toHaveBeenCalledWith(expect.objectContaining({
            workflow_id: 'wf-26',
            version: 5,
        }));
        expect(saved).toMatchObject({
            workflow_id: 'wf-26',
            version: 5,
        });
    });

    it('assigns the next persisted export version when creating a draft', async () => {
        exportRepository.findOne!.mockResolvedValue({
            id: 27,
            workflow_id: 'wf-27',
            version: 2,
        } as ExportWorkflow);
        exportRepository.save!.mockImplementation(async (workflow) => workflow as ExportWorkflow);

        const saved = await service.saveExport({
            workflow_id: 'wf-27',
            label: 'Draft export',
            mapping: '$',
        } as ExportWorkflow);

        expect(exportRepository.save).toHaveBeenCalledWith(expect.objectContaining({
            workflow_id: 'wf-27',
            version: 3,
        }));
        expect(saved).toMatchObject({
            workflow_id: 'wf-27',
            version: 3,
        });
    });

    it('assigns the next persisted validation version when creating a draft', async () => {
        validationRepository.findOne!.mockResolvedValue({
            id: 31,
            workflow_id: 'wf-31',
            version: 7,
        } as ValidationWorkflow);
        validationRepository.save!.mockImplementation(async (workflow) => workflow as ValidationWorkflow);

        const saved = await service.saveValidation({
            workflow_id: 'wf-31',
            label: 'Draft validation',
            target: 'publication',
        } as ValidationWorkflow);

        expect(validationRepository.save).toHaveBeenCalledWith(expect.objectContaining({
            workflow_id: 'wf-31',
            version: 8,
            rules: [],
        }));
        expect(saved).toMatchObject({
            workflow_id: 'wf-31',
            version: 8,
            rules: [],
        });
    });

    it('rejects saving a locked validation draft for another user', async () => {
        validationRepository.findOneBy!.mockResolvedValue({
            id: 32,
            workflow_id: 'wf-32',
            label: 'Locked validation',
            version: 1,
            target: 'publication',
            rules: [],
            locked_at: new Date(),
            published_at: null,
            deleted_at: null,
        } as ValidationWorkflow);
        configService.get.mockImplementation(async (key: string) => {
            if (key === 'lock_timeout') return 5;
            return undefined;
        });

        await expect(service.saveValidation({ id: 32, label: 'blocked' } as ValidationWorkflow, 'mallory'))
            .rejects.toBeInstanceOf(ConflictException);
        expect(validationRepository.save).not.toHaveBeenCalled();
    });

    it('deletes validation workflow reports after archiving a published workflow', async () => {
        const publishedWorkflow = {
            id: 34,
            workflow_id: 'wf-34',
            label: 'Validation',
            version: 2,
            target: 'publication',
            rules: [],
            published_at: new Date('2026-03-16T10:00:00.000Z'),
            deleted_at: null,
        } as ValidationWorkflow;
        validationRepository.findOneBy!.mockResolvedValue(publishedWorkflow);
        validationRepository.save!.mockImplementation(async (workflow) => workflow as ValidationWorkflow);
        workflowReportService.deleteReportsForWorkflow.mockResolvedValue(undefined);

        await service.saveValidation({ id: 34, deleted_at: new Date('2026-03-16T11:00:00.000Z') } as ValidationWorkflow);

        expect(validationRepository.save).toHaveBeenCalledWith(expect.objectContaining({
            id: 34,
            deleted_at: expect.any(Date),
        }));
        expect(workflowReportService.deleteReportsForWorkflow).toHaveBeenCalledWith(34, WorkflowType.VALIDATION);
    });

    it('rejects export unlock-only requests for another user while a draft is locked', async () => {
        exportRepository.findOneBy!.mockResolvedValue({
            id: 28,
            workflow_id: 'wf-28',
            label: 'Draft export',
            version: 1,
            strategy_type: ExportStrategy.HTTP_RESPONSE,
            strategy: { format: 'json', disposition: 'inline' },
            mapping: '$',
            locked_at: new Date(),
            published_at: null,
            deleted_at: null,
        } as ExportWorkflow);
        configService.get.mockImplementation(async (key: string) => {
            if (key === 'lock_timeout') return 5;
            return undefined;
        });

        await expect(service.saveExport({ id: 28, locked_at: null } as ExportWorkflow, 'mallory'))
            .rejects.toBeInstanceOf(ConflictException);
        expect(exportRepository.save).not.toHaveBeenCalled();
    });

    it('starts URL_LOOKUP_AND_RETRIEVE workflows via JSONata import service', async () => {
        const publishedWorkflow = {
            id: 33,
            workflow_id: 'wf-33',
            label: 'PubMed-like import',
            version: 1,
            strategy_type: ImportStrategy.URL_LOOKUP_AND_RETRIEVE,
            strategy: {
                url_lookup: 'https://example.org/search',
                url_retrieve: 'https://example.org/item/[id]',
                max_res: 100,
                max_res_name: 'retmax',
                request_mode: 'offset',
                offset_name: 'retstart',
                offset_start: 0,
                get_count: '$.count',
                get_lookup_ids: '$.ids',
                get_retrieve_item: '$.item',
                exclusion_criteria: 'false',
                only_import_if_authors_inst: false,
                format: 'json',
            },
            mapping: '$',
            published_at: new Date('2026-03-16T10:00:00.000Z'),
            deleted_at: null,
            update_config: { title: 'IGNORE' },
        } as unknown as ImportWorkflow;
        importRepository.findOneBy!.mockResolvedValue(publishedWorkflow);
        importService.setReportingYear.mockResolvedValue(undefined);
        importService.setUp.mockResolvedValue(undefined);
        importService.importLookupAndRetrieve.mockResolvedValue(undefined);
        importService.getCurrentWorkflowReportId.mockReturnValue(7001);
        workflowReportService.waitForCompletion.mockResolvedValue(undefined);

        await service.startImport(33, 2024, [], null, true, 'tester', false);

        expect(importService.setReportingYear).toHaveBeenCalledWith('2024');
        expect(importService.setUp).toHaveBeenCalledWith(publishedWorkflow, publishedWorkflow.update_config);
        expect(importService.importLookupAndRetrieve).toHaveBeenCalledWith(true, 'tester', false);
        expect(workflowReportService.waitForCompletion).toHaveBeenCalledWith(
            7001,
            500,
            expect.objectContaining({ allowStale: false }),
        );
    });

    it('keeps strategy_type undefined until explicitly set', async () => {
        exportRepository.save!.mockImplementation(async (workflow) => workflow as ExportWorkflow);

        const saved = await service.saveExport({
            label: 'Export',
            mapping: '$',
            strategy: { format: 'json', disposition: 'inline' },
        } as ExportWorkflow);

        expect(exportRepository.save).toHaveBeenCalledWith(expect.objectContaining({
            workflow_id: 'test-uuid',
            version: 1,
            strategy_type: undefined,
        }));
        expect(saved).toMatchObject({
            workflow_id: 'test-uuid',
            version: 1,
            strategy_type: undefined,
        });
    });

    it('normalizes string strategy_type values before persisting export workflows', async () => {
        exportRepository.save!.mockImplementation(async (workflow) => workflow as ExportWorkflow);

        const saved = await service.saveExport({
            label: 'Export',
            mapping: '$',
            strategy_type: 'HTTP_RESPONSE' as unknown as ExportStrategy,
            strategy: { format: 'json', disposition: 'inline' },
        } as ExportWorkflow);

        expect(exportRepository.save).toHaveBeenCalledWith(expect.objectContaining({
            workflow_id: 'test-uuid',
            version: 1,
            strategy_type: ExportStrategy.HTTP_RESPONSE,
        }));
        expect(saved).toMatchObject({
            strategy_type: ExportStrategy.HTTP_RESPONSE,
        });
    });

    it('rejects invalid export strategies before persisting', async () => {
        await expect(service.saveExport({
            label: 'Broken export',
            mapping: '$',
            strategy_type: ExportStrategy.HTTP_RESPONSE,
            strategy: {
                format: 'xml',
                disposition: 'inline',
                root_name: 'records',
            },
        } as unknown as ExportWorkflow)).rejects.toBeInstanceOf(BadRequestException);

        expect(exportRepository.save).not.toHaveBeenCalled();
    });

    it('starts published export workflows via JSONata export service', async () => {
        const publishedWorkflow = {
            id: 52,
            workflow_id: 'wf-52',
            label: 'JSON export',
            version: 1,
            strategy_type: ExportStrategy.HTTP_RESPONSE,
            strategy: { format: 'json', disposition: 'inline' },
            mapping: '$',
            published_at: new Date('2026-03-16T10:00:00.000Z'),
            deleted_at: null,
        } as ExportWorkflow;
        const filter = { filter: { expr: [] } as any, paths: ['recent'] };

        exportRepository.findOneBy!.mockResolvedValue(publishedWorkflow);
        exportService.setUp.mockResolvedValue(undefined);
        exportService.export.mockResolvedValue('{"ok":true}');

        const result = await service.startExport(52, filter, 'tester', true);

        expect(exportService.setUp).toHaveBeenCalledWith(publishedWorkflow);
        expect(exportService.export).toHaveBeenCalledWith(filter, [], 'tester', true);
        expect(result).toBe('{"ok":true}');
    });

    it('starts draft export workflows via JSONata export service', async () => {
        const draftWorkflow = {
            id: 53,
            workflow_id: 'wf-53',
            label: 'Draft export',
            version: 1,
            strategy_type: ExportStrategy.HTTP_RESPONSE,
            strategy: { format: 'json', disposition: 'inline' },
            mapping: '$',
            published_at: null,
            deleted_at: null,
        } as ExportWorkflow;

        exportRepository.findOneBy!.mockResolvedValue(draftWorkflow);
        exportService.setUp.mockResolvedValue(undefined);
        exportService.export.mockResolvedValue('{"draft":true}');

        const result = await service.startExport(53, undefined, 'tester', false);

        expect(exportService.setUp).toHaveBeenCalledWith(draftWorkflow);
        expect(exportService.export).toHaveBeenCalledWith(undefined, [], 'tester', false);
        expect(result).toBe('{"draft":true}');
    });

    it('rejects archived export workflows', async () => {
        const archivedWorkflow = {
            id: 54,
            workflow_id: 'wf-54',
            label: 'Archived export',
            version: 2,
            strategy_type: ExportStrategy.HTTP_RESPONSE,
            strategy: { format: 'json', disposition: 'inline' },
            mapping: '$',
            published_at: new Date('2026-03-16T10:00:00.000Z'),
            deleted_at: new Date('2026-03-18T10:00:00.000Z'),
        } as ExportWorkflow;

        exportRepository.findOneBy!.mockResolvedValue(archivedWorkflow);

        await expect(service.startExport(54)).rejects.toThrow('Error: archived workflows cannot be executed');
        expect(exportService.setUp).not.toHaveBeenCalled();
        expect(exportService.export).not.toHaveBeenCalled();
    });

    it('starts draft validation workflows via validation service', async () => {
        const draftWorkflow = {
            id: 55,
            workflow_id: 'wf-55',
            label: 'Draft validation',
            version: 1,
            target: 'publication',
            rules: [{ type: 'required', result: 'error', path: 'doi' }],
            published_at: null,
            deleted_at: null,
        } as unknown as ValidationWorkflow;

        validationRepository.findOneBy!.mockResolvedValue(draftWorkflow);
        validationService.setUp.mockResolvedValue(undefined);
        validationService.validate.mockResolvedValue({
            target: 'publication',
            checked: 10,
            findings: 1,
            info: 0,
            warning: 0,
            error: 1,
        });

        await expect(service.startValidation(55, 'tester')).resolves.toBeUndefined();

        expect(validationService.setUp).toHaveBeenCalledWith(draftWorkflow);
        expect(validationService.validate).toHaveBeenCalledWith('tester');
    });

    it('rejects archived validation workflows', async () => {
        const archivedWorkflow = {
            id: 56,
            workflow_id: 'wf-56',
            label: 'Archived validation',
            version: 1,
            target: 'publication',
            rules: [],
            published_at: new Date('2026-03-16T10:00:00.000Z'),
            deleted_at: new Date('2026-03-18T10:00:00.000Z'),
        } as ValidationWorkflow;

        validationRepository.findOneBy!.mockResolvedValue(archivedWorkflow);

        await expect(service.startValidation(56, 'tester')).rejects.toThrow('Error: archived workflows cannot be executed');
        expect(validationService.setUp).not.toHaveBeenCalled();
        expect(validationService.validate).not.toHaveBeenCalled();
    });

    it('reacquires expired workflow locks and hides the lock in the response', async () => {
        const staleLockedWorkflow = {
            id: 58,
            workflow_id: 'wf-58',
            label: 'Stale draft',
            version: 1,
            strategy_type: ImportStrategy.FILE_UPLOAD,
            strategy: {},
            mapping: '$',
            locked_at: new Date(Date.now() - 10 * 60 * 1000),
            published_at: null,
            deleted_at: null,
        } as ImportWorkflow;

        importRepository.findOne!.mockResolvedValue(staleLockedWorkflow);
        (importRepository.update as jest.Mock).mockResolvedValue({ affected: 1 });
        configService.get.mockImplementation(async (key: string) => {
            if (key === 'lock_timeout') return 5;
            return undefined;
        });

        const workflow = await service.getImport(58, true, 'alice');

        expect(importRepository.update).toHaveBeenCalledWith(expect.objectContaining({
            id: 58,
            published_at: expect.anything(),
            deleted_at: expect.anything(),
            locked_at: expect.anything(),
        }), expect.objectContaining({
            locked_at: expect.any(Date),
        }));
        expect(workflow).toMatchObject({
            id: 58,
            workflow_id: 'wf-58',
        });
        expect(workflow.locked_at).toBeUndefined();
    });

    it('rejects opening a draft when another request acquires the lock first', async () => {
        const unlockedWorkflow = {
            id: 59,
            workflow_id: 'wf-59',
            label: 'Draft',
            version: 1,
            strategy_type: ImportStrategy.FILE_UPLOAD,
            strategy: {},
            mapping: '$',
            locked_at: null,
            published_at: null,
            deleted_at: null,
        } as ImportWorkflow;

        importRepository.findOne!.mockResolvedValue(unlockedWorkflow);
        (importRepository.update as jest.Mock).mockResolvedValue({ affected: 0 });

        await expect(service.getImport(59)).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects concurrent workflow import starts while the import service is busy', async () => {
        const publishedWorkflow = {
            id: 61,
            workflow_id: 'wf-61',
            label: 'Concurrent import',
            version: 1,
            strategy_type: ImportStrategy.URL_QUERY_OFFSET,
            strategy: {
                url_items: 'https://example.org/items',
                url_count: 'https://example.org/count',
                max_res: 50,
                max_res_name: 'rows',
                request_mode: 'offset',
                offset_name: 'offset',
                offset_count: 0,
                offset_start: 0,
                get_count: '$.count',
                get_items: '$.items',
                format: 'json',
            },
            mapping: '$',
            published_at: new Date('2026-03-16T10:00:00.000Z'),
            deleted_at: null,
            update_config: {},
        } as unknown as ImportWorkflow;
        let releaseCompletion: () => void;
        const completionPromise = new Promise<void>((resolve) => {
            releaseCompletion = resolve;
        });

        importRepository.findOneBy!.mockResolvedValue(publishedWorkflow);
        importService.setReportingYear.mockResolvedValue(undefined);
        importService.setUp.mockResolvedValue(undefined);
        importService.getCurrentWorkflowReportId.mockReturnValue(9001);
        importService.import.mockResolvedValue(undefined);
        workflowReportService.waitForCompletion.mockReturnValue(completionPromise);

        const firstStart = service.startImport(61, 2024, [], null, false, 'tester', false);
        await firstStart;

        await expect(service.startImport(61, 2024, [], null, false, 'tester', false)).rejects.toBeInstanceOf(ConflictException);
        expect(workflowReportService.waitForCompletion).toHaveBeenCalledWith(
            9001,
            500,
            expect.objectContaining({ allowStale: false }),
        );

        releaseCompletion!();
        await completionPromise;
        await Promise.resolve();
        await new Promise((resolve) => setImmediate(resolve));

        await expect(service.startImport(61, 2024, [], null, false, 'tester', false)).resolves.toBeUndefined();
    });

    it('releases the import lock via watchdog timeout and writes a warning', async () => {
        jest.useFakeTimers();
        try {
            const publishedWorkflow = {
                id: 62,
                workflow_id: 'wf-62',
                label: 'Watchdog import',
                version: 1,
                strategy_type: ImportStrategy.URL_QUERY_OFFSET,
                strategy: {
                    url_items: 'https://example.org/items',
                    url_count: 'https://example.org/count',
                    max_res: 50,
                    max_res_name: 'rows',
                    request_mode: 'offset',
                    offset_name: 'offset',
                    offset_count: 0,
                    offset_start: 0,
                    get_count: '$.count',
                    get_items: '$.items',
                    format: 'json',
                },
                mapping: '$',
                published_at: new Date('2026-03-16T10:00:00.000Z'),
                deleted_at: null,
                update_config: {},
            } as unknown as ImportWorkflow;
            const neverCompletion = new Promise<void>(() => undefined);

            configService.get.mockImplementation(async (key: string) => {
                if (key === 'workflow_import_watchdog_timeout') return 1;
                return undefined;
            });
            importRepository.findOneBy!.mockResolvedValue(publishedWorkflow);
            importService.setReportingYear.mockResolvedValue(undefined);
            importService.setUp.mockResolvedValue(undefined);
            importService.getCurrentWorkflowReportId.mockReturnValue(9002);
            importService.import.mockResolvedValue(undefined);
            workflowReportService.waitForCompletion
                .mockReturnValueOnce(neverCompletion)
                .mockResolvedValue(undefined);
            workflowReportService.write.mockResolvedValue(undefined);

            await service.startImport(62, 2024, [], null, false, 'tester', false);
            await expect(service.startImport(62, 2024, [], null, false, 'tester', false)).rejects.toBeInstanceOf(ConflictException);

            await jest.advanceTimersByTimeAsync(60_000);
            await Promise.resolve();

            expect(workflowReportService.write).toHaveBeenCalledWith(9002, expect.objectContaining({
                level: WorkflowReportItemLevel.WARNING,
                code: 'workflow-import-watchdog',
            }));
            await expect(service.startImport(62, 2024, [], null, false, 'tester', false)).resolves.toBeUndefined();
        } finally {
            jest.useRealTimers();
        }
    });

    it('deletes workflow reports before deleting draft import workflows', async () => {
        importRepository.findBy!.mockResolvedValue([
            { id: 3, published_at: null, deleted_at: null } as ImportWorkflow,
        ]);
        workflowReportService.deleteReportsForWorkflow.mockResolvedValue(undefined);
        (importRepository.remove as jest.Mock).mockResolvedValue([{ id: 3 }]);

        await service.deleteImports([3]);

        expect(workflowReportService.deleteReportsForWorkflow).toHaveBeenCalledWith(3, WorkflowType.IMPORT);
        expect(importRepository.remove).toHaveBeenCalledWith([
            expect.objectContaining({ id: 3 }),
        ]);
    });

    it('deletes only draft export workflows', async () => {
        exportRepository.findBy!.mockResolvedValue([
            { id: 4, published_at: null, deleted_at: null } as ExportWorkflow,
        ]);
        workflowReportService.deleteReportsForWorkflow.mockResolvedValue(undefined);
        (exportRepository.remove as jest.Mock).mockResolvedValue([{ id: 4 }]);

        await service.deleteExports([4]);

        expect(workflowReportService.deleteReportsForWorkflow).toHaveBeenCalledWith(4, WorkflowType.EXPORT);
        expect(exportRepository.remove).toHaveBeenCalledWith([
            expect.objectContaining({ id: 4 }),
        ]);
    });

    it('deletes only draft validation workflows', async () => {
        validationRepository.findBy!.mockResolvedValue([
            { id: 5, published_at: null, deleted_at: null } as ValidationWorkflow,
        ]);
        workflowReportService.deleteReportsForWorkflow.mockResolvedValue(undefined);
        (validationRepository.remove as jest.Mock).mockResolvedValue([{ id: 5 }]);

        await service.deleteValidations([5]);

        expect(workflowReportService.deleteReportsForWorkflow).toHaveBeenCalledWith(5, WorkflowType.VALIDATION);
        expect(validationRepository.remove).toHaveBeenCalledWith([
            expect.objectContaining({ id: 5 }),
        ]);
    });

    it('returns workflow-scoped import status from workflow reports', async () => {
        workflowReportService.getStatusForWorkflow.mockResolvedValue({
            progress: -1,
            status: 'Started on Tue Mar 19 2026 08:00:00 GMT+0100',
        });

        const status = await service.status(33);

        expect(status).toEqual({
            progress: -1,
            status: 'Started on Tue Mar 19 2026 08:00:00 GMT+0100',
        });
        expect(workflowReportService.getStatusForWorkflow).toHaveBeenCalledWith(33, 'import');
    });

    it('returns workflow-scoped export status from workflow reports', async () => {
        workflowReportService.getStatusForWorkflow.mockResolvedValue({
            progress: 0,
            status: 'Successful export',
        });

        const status = await service.exportStatus(77);

        expect(status).toEqual({
            progress: 0,
            status: 'Successful export',
        });
        expect(workflowReportService.getStatusForWorkflow).toHaveBeenCalledWith(77, 'export');
    });

    it('returns workflow-scoped validation status from workflow reports', async () => {
        workflowReportService.getStatusForWorkflow.mockResolvedValue({
            progress: 0,
            status: 'Successful validation',
        });

        const status = await service.validationStatus(88);

        expect(status).toEqual({
            progress: 0,
            status: 'Successful validation',
        });
        expect(workflowReportService.getStatusForWorkflow).toHaveBeenCalledWith(88, 'validation');
    });
});
