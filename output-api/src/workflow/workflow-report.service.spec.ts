import { WorkflowType } from '../../../output-interfaces/Workflow';
import { WorkflowReportService } from './workflow-report.service';

describe('WorkflowReportService', () => {
    let service: WorkflowReportService;
    let workflowReportRepository: any;
    let workflowReportItemRepository: any;
    let configService: any;

    beforeEach(() => {
        workflowReportRepository = {
            save: jest.fn(async (value) => value),
            createQueryBuilder: jest.fn(),
            findOneBy: jest.fn(),
        };
        workflowReportItemRepository = {};
        configService = {
            get: jest.fn(async () => 5),
        };

        service = new WorkflowReportService(
            workflowReportRepository,
            workflowReportItemRepository,
            configService,
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
            progress: 0,
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

    it('updates workflow report progress and status explicitly', async () => {
        workflowReportRepository.findOneBy.mockResolvedValue({
            id: 11,
            status: 'initialized',
            progress: 0,
        });

        const report = await service.updateStatus(11, {
            status: 'Started on Thu Mar 19 2026 08:00:00 GMT+0100',
            progress: -1,
        });

        expect(workflowReportRepository.save).toHaveBeenCalledWith(expect.objectContaining({
            id: 11,
            status: 'Started on Thu Mar 19 2026 08:00:00 GMT+0100',
            progress: -1,
        }));
        expect(report.progress).toBe(-1);
        expect(report.status).toBe('Started on Thu Mar 19 2026 08:00:00 GMT+0100');
    });

    it('returns initialized when a workflow has no reports', async () => {
        const queryBuilder = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            addOrderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn(async () => []),
        };
        workflowReportRepository.createQueryBuilder.mockReturnValue(queryBuilder);

        const status = await service.getStatusForWorkflow(9, WorkflowType.IMPORT);

        expect(status).toEqual({
            progress: 0,
            status: 'initialized',
        });
    });

    it('prefers the latest unfinished workflow report for status', async () => {
        const now = new Date();
        const queryBuilder = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            addOrderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn(async () => [
                {
                    id: 8,
                    workflow_type: WorkflowType.IMPORT,
                    importWorkflow: { id: 3, label: 'Import WF', version: 2 },
                    status: 'Successful import',
                    progress: 0,
                    updated_at: now,
                    finished_at: new Date('2026-03-19T06:00:00.000Z'),
                },
                {
                    id: 7,
                    workflow_type: WorkflowType.IMPORT,
                    importWorkflow: { id: 3, label: 'Import WF', version: 2 },
                    status: 'Started on Thu Mar 19 2026 07:00:00 GMT+0100',
                    progress: -1,
                    updated_at: now,
                    finished_at: null,
                },
            ]),
        };
        workflowReportRepository.createQueryBuilder.mockReturnValue(queryBuilder);

        const status = await service.getStatusForWorkflow(3, WorkflowType.IMPORT);

        expect(status).toEqual({
            progress: -1,
            status: 'Started on Thu Mar 19 2026 07:00:00 GMT+0100',
            stale: false,
            reportId: 7,
        });
    });

    it('falls back to the latest finished workflow report when the unfinished one is stale', async () => {
        const now = new Date();
        const staleTimestamp = new Date(now.getTime() - 6 * 60 * 1000);
        const queryBuilder = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            addOrderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn(async () => [
                {
                    id: 12,
                    workflow_type: WorkflowType.IMPORT,
                    importWorkflow: { id: 4, label: 'Import WF', version: 2 },
                    status: 'Started on Thu Mar 19 2026 07:00:00 GMT+0100',
                    progress: -1,
                    updated_at: staleTimestamp,
                    finished_at: null,
                },
                {
                    id: 11,
                    workflow_type: WorkflowType.IMPORT,
                    importWorkflow: { id: 4, label: 'Import WF', version: 2 },
                    status: 'Successful import',
                    progress: 0,
                    updated_at: now,
                    finished_at: now,
                },
            ]),
        };
        workflowReportRepository.createQueryBuilder.mockReturnValue(queryBuilder);

        const status = await service.getStatusForWorkflow(4, WorkflowType.IMPORT);

        expect(status).toEqual({
            progress: 0,
            status: 'Successful import',
            stale: false,
            reportId: 11,
        });
        expect(configService.get).toHaveBeenCalledWith('lock_timeout');
    });

    it('returns a stale status when only stale unfinished workflow reports exist', async () => {
        const staleTimestamp = new Date(Date.now() - 6 * 60 * 1000);
        const queryBuilder = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            addOrderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn(async () => [
                {
                    id: 15,
                    workflow_type: WorkflowType.IMPORT,
                    importWorkflow: { id: 5, label: 'Import WF', version: 2 },
                    status: 'Started on Thu Mar 19 2026 07:00:00 GMT+0100',
                    progress: -1,
                    updated_at: staleTimestamp,
                    finished_at: null,
                },
            ]),
        };
        workflowReportRepository.createQueryBuilder.mockReturnValue(queryBuilder);

        const status = await service.getStatusForWorkflow(5, WorkflowType.IMPORT);

        expect(status).toEqual({
            progress: 0,
            status: 'Started on Thu Mar 19 2026 07:00:00 GMT+0100 [stale]',
            stale: true,
            reportId: 15,
        });
    });
});
