import { WorkflowType } from '../../../output-interfaces/Workflow';
import { WorkflowController } from './WorkflowController';

jest.mock('uuid', () => ({
    v4: jest.fn(() => '00000000-0000-0000-0000-000000000000'),
}));

describe('WorkflowController', () => {
    let controller: WorkflowController;
    let workflowService: {
        getImport: jest.Mock;
        getExport: jest.Mock;
        startExport: jest.Mock;
    };
    let workflowReportService: {
        getReports: jest.Mock;
    };

    beforeEach(() => {
        workflowService = {
            getImport: jest.fn(),
            getExport: jest.fn(),
            startExport: jest.fn(),
        };
        workflowReportService = {
            getReports: jest.fn(),
        };

        controller = new WorkflowController(
            {} as never,
            {} as never,
            workflowService as never,
            workflowReportService as never,
        );
    });

    it('reads import exports without locking the workflow', async () => {
        workflowService.getImport.mockResolvedValue({
            label: 'Import workflow',
            version: 2,
            published_at: new Date('2026-03-19T12:00:00.000Z'),
        });

        await controller.export_import(41, { setHeader: jest.fn() } as never);

        expect(workflowService.getImport).toHaveBeenCalledWith(41, false);
    });

    it('reads export exports without locking the workflow', async () => {
        workflowService.getExport.mockResolvedValue({
            label: 'Export workflow',
            version: 3,
            published_at: new Date('2026-03-19T12:00:00.000Z'),
        });

        await controller.export_export(52, { setHeader: jest.fn() } as never);

        expect(workflowService.getExport).toHaveBeenCalledWith(52, false);
    });

    it('loads import workflow reports without locking the workflow and forwards paging', async () => {
        workflowService.getImport.mockResolvedValue({ id: 61 });
        workflowReportService.getReports.mockResolvedValue([]);

        await controller.workflowReports(61, 5, 10);

        expect(workflowService.getImport).toHaveBeenCalledWith(61, false);
        expect(workflowReportService.getReports).toHaveBeenCalledWith(61, WorkflowType.IMPORT, {
            limit: 5,
            offset: 10,
        });
    });

    it('loads export workflow reports without locking the workflow and forwards paging', async () => {
        workflowService.getExport.mockResolvedValue({ id: 71 });
        workflowReportService.getReports.mockResolvedValue([]);

        await controller.exportWorkflowReports(71, 5, 10);

        expect(workflowService.getExport).toHaveBeenCalledWith(71, false);
        expect(workflowReportService.getReports).toHaveBeenCalledWith(71, WorkflowType.EXPORT, {
            limit: 5,
            offset: 10,
        });
    });
});
