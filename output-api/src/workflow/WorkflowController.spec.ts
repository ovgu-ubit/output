import { WorkflowType } from '../../../output-interfaces/Workflow';
import { WorkflowController } from './WorkflowController';

describe('WorkflowController', () => {
    let controller: WorkflowController;
    let workflowService: {
        getImport: jest.Mock;
        getExport: jest.Mock;
        getValidations: jest.Mock;
        getValidation: jest.Mock;
        deleteValidations: jest.Mock;
        startValidation: jest.Mock;
        unlockValidation: jest.Mock;
        validationStatus: jest.Mock;
        startExport: jest.Mock;
    };
    let workflowReportService: {
        getReports: jest.Mock;
    };

    beforeEach(() => {
        workflowService = {
            getImport: jest.fn(),
            getExport: jest.fn(),
            getValidations: jest.fn(),
            getValidation: jest.fn(),
            deleteValidations: jest.fn(),
            startValidation: jest.fn(),
            unlockValidation: jest.fn(),
            validationStatus: jest.fn(),
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

    it('forwards validation list requests including the type filter', async () => {
        workflowService.getValidations.mockResolvedValue([]);

        await controller.get_validations('draft');

        expect(workflowService.getValidations).toHaveBeenCalledWith('draft');
    });

    it('loads validation workflows with locking enabled for the current user', async () => {
        workflowService.getValidation.mockResolvedValue({ id: 91 });

        await controller.get_validation(91, { user: { username: 'alice' } });

        expect(workflowService.getValidation).toHaveBeenCalledWith(91, true, 'alice');
    });

    it('deletes validation workflows by mapped ids', async () => {
        workflowService.deleteValidations.mockResolvedValue([{ id: 14 }]);

        await controller.delete_validations([{ id: 14 }, { id: 15 }]);

        expect(workflowService.deleteValidations).toHaveBeenCalledWith([14, 15]);
    });

    it('loads validation workflow reports without locking the workflow and forwards paging', async () => {
        workflowService.getValidation.mockResolvedValue({ id: 81 });
        workflowReportService.getReports.mockResolvedValue([]);

        await controller.validationWorkflowReports(81, 3, 6);

        expect(workflowService.getValidation).toHaveBeenCalledWith(81, false);
        expect(workflowReportService.getReports).toHaveBeenCalledWith(81, WorkflowType.VALIDATION, {
            limit: 3,
            offset: 6,
        });
    });

    it('starts validation workflow runs for the current user', async () => {
        workflowService.startValidation.mockResolvedValue(undefined);

        await controller.run_validation(33, { user: { username: 'alice' } });

        expect(workflowService.startValidation).toHaveBeenCalledWith(33, 'alice');
    });

    it('unlocks validation workflows without forwarding a workflow body', async () => {
        workflowService.unlockValidation.mockResolvedValue({ id: 33, locked_at: null });

        await controller.unlock_validation(33, { user: { username: 'alice' } });

        expect(workflowService.unlockValidation).toHaveBeenCalledWith(33, 'alice');
    });

    it('reads validation workflow status via the workflow service', async () => {
        workflowService.validationStatus.mockResolvedValue({ progress: -1, status: 'Started' });

        const status = await controller.validationStatus(44);

        expect(status).toEqual({ progress: -1, status: 'Started' });
        expect(workflowService.validationStatus).toHaveBeenCalledWith(44);
    });
});
