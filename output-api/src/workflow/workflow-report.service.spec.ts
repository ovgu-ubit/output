import { WorkflowType } from '../../../output-interfaces/Workflow';
import { WorkflowReportService } from './workflow-report.service';

describe('WorkflowReportService', () => {
    let service: WorkflowReportService;
    let workflowReportRepository: any;
    let workflowReportItemRepository: any;

    beforeEach(() => {
        workflowReportRepository = {
            save: jest.fn(async (value) => value),
            createQueryBuilder: jest.fn(),
        };
        workflowReportItemRepository = {};

        service = new WorkflowReportService(
            workflowReportRepository,
            workflowReportItemRepository,
            { getPublicationChangesForReport: jest.fn() } as any,
        );
    });

    it('stores export workflow references with workflow_type', async () => {
        const exportWorkflow = { id: 17, label: 'Export WF', version: 2 };

        const report = await service.createReport({
            workflow_type: WorkflowType.EXPORT,
            workflow: exportWorkflow as any,
            params: { foo: 'bar' },
        } as any);

        expect(workflowReportRepository.save).toHaveBeenCalledWith(expect.objectContaining({
            workflow_type: WorkflowType.EXPORT,
            exportWorkflow,
            importWorkflow: undefined,
        }));
        expect(report.workflow).toBe(exportWorkflow);
        expect(report.workflowId).toBe(17);
    });

    it('hydrates workflow references for export report lists', async () => {
        const queryBuilder = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            addOrderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn(async () => [{
                id: 5,
                workflow_type: WorkflowType.EXPORT,
                exportWorkflow: { id: 9, label: 'Exported', version: 1 },
            }]),
        };
        workflowReportRepository.createQueryBuilder.mockReturnValue(queryBuilder);

        const reports = await service.getReports(9, WorkflowType.EXPORT);

        expect(reports[0].workflow).toMatchObject({ id: 9, label: 'Exported', version: 1 });
        expect(reports[0].workflowId).toBe(9);
    });
});
