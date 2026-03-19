import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ExportStrategy, ImportStrategy } from '../../../output-interfaces/Workflow';
import { AppConfigService } from '../config/app-config.service';
import { ExportWorkflow } from './ExportWorkflow.entity';
import { JSONataExportService } from './export/jsonata-export.service';
import { ImportWorkflow } from './ImportWorkflow.entity';
import { JSONataImportService } from './import/jsonata-import';
import { WorkflowReportService } from './workflow-report.service';
import { WorkflowService } from './workflow.service';

jest.mock('uuid', () => ({
    v4: jest.fn(() => 'test-uuid'),
}));

describe('WorkflowService', () => {
    let service: WorkflowService;
    let importRepository: jest.Mocked<Partial<Repository<ImportWorkflow>>>;
    let exportRepository: jest.Mocked<Partial<Repository<ExportWorkflow>>>;
    let workflowReportService: { deleteReportsForWorkflow: jest.Mock, getStatusForWorkflow: jest.Mock };
    let exportService: {
        setUp: jest.Mock;
        export: jest.Mock;
        status: jest.Mock;
    };
    let importService: {
        getUpdateMapping: jest.Mock;
        setReportingYear: jest.Mock;
        setUp: jest.Mock;
        import: jest.Mock;
        importLookupAndRetrieve: jest.Mock;
        enrich: jest.Mock;
        loadFile: jest.Mock;
    };

    beforeEach(async () => {
        importRepository = {
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            findBy: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
        };
        exportRepository = {
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            findBy: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
        };
        workflowReportService = {
            deleteReportsForWorkflow: jest.fn(),
            getStatusForWorkflow: jest.fn(),
        };
        exportService = {
            setUp: jest.fn(),
            export: jest.fn(),
            status: jest.fn(),
        };
        importService = {
            getUpdateMapping: jest.fn(),
            setReportingYear: jest.fn(),
            setUp: jest.fn(),
            import: jest.fn(),
            importLookupAndRetrieve: jest.fn(),
            enrich: jest.fn(),
            loadFile: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkflowService,
                { provide: getRepositoryToken(ImportWorkflow), useValue: importRepository },
                { provide: getRepositoryToken(ExportWorkflow), useValue: exportRepository },
                { provide: AppConfigService, useValue: { get: jest.fn() } },
                { provide: JSONataImportService, useValue: importService },
                { provide: JSONataExportService, useValue: exportService },
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
        expect(workflowReportService.deleteReportsForWorkflow).toHaveBeenCalledWith(14);
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

        await service.startImport(33, 2024, [], null, true, 'tester', false);

        expect(importService.setReportingYear).toHaveBeenCalledWith('2024');
        expect(importService.setUp).toHaveBeenCalledWith(publishedWorkflow, publishedWorkflow.update_config);
        expect(importService.importLookupAndRetrieve).toHaveBeenCalledWith(true, 'tester', false);
    });

    it('defaults new export workflows to HTTP_RESPONSE', async () => {
        exportRepository.save!.mockImplementation(async (workflow) => workflow as ExportWorkflow);

        const saved = await service.saveExport({
            label: 'Export',
            mapping: '$',
            strategy: { format: 'json', disposition: 'inline' },
        } as ExportWorkflow);

        expect(exportRepository.save).toHaveBeenCalledWith(expect.objectContaining({
            workflow_id: 'test-uuid',
            version: 1,
            strategy_type: ExportStrategy.HTTP_RESPONSE,
        }));
        expect(saved).toMatchObject({
            workflow_id: 'test-uuid',
            version: 1,
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

    it('deletes only draft export workflows', async () => {
        exportRepository.findBy!.mockResolvedValue([
            { id: 4, published_at: null, deleted_at: null } as ExportWorkflow,
        ]);
        (exportRepository.remove as jest.Mock).mockResolvedValue([{ id: 4 }]);

        await service.deleteExports([4]);

        expect(exportRepository.remove).toHaveBeenCalledWith([
            expect.objectContaining({ id: 4 }),
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
});
