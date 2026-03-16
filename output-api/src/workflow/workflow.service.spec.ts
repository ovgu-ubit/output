import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Strategy } from '../../../output-interfaces/Workflow';
import { AppConfigService } from '../config/app-config.service';
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
    let workflowReportService: { deleteReportsForWorkflow: jest.Mock };

    beforeEach(async () => {
        importRepository = {
            findOneBy: jest.fn(),
            save: jest.fn(),
        };
        workflowReportService = {
            deleteReportsForWorkflow: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkflowService,
                { provide: getRepositoryToken(ImportWorkflow), useValue: importRepository },
                { provide: AppConfigService, useValue: { get: jest.fn() } },
                { provide: JSONataImportService, useValue: { getUpdateMapping: jest.fn() } },
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
            strategy_type: Strategy.FILE_UPLOAD,
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
            strategy_type: Strategy.FILE_UPLOAD,
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
});
