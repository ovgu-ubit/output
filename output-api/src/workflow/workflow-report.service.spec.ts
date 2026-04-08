import { HttpException } from '@nestjs/common';
import { ApiErrorCode } from '../../../output-interfaces/ApiError';
import { WorkflowType } from '../../../output-interfaces/Workflow';
import { WorkflowReportService } from './workflow-report.service';

const expectApiError = async (
    promise: Promise<unknown>,
    expected: {
        statusCode: number;
        code: ApiErrorCode;
    },
) => {
    try {
        await promise;
        fail(`Expected promise to reject with ${expected.code}`);
    } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getResponse()).toMatchObject(expected);
    }
};

describe('WorkflowReportService', () => {
    let service: WorkflowReportService;
    let workflowReportRepository: any;
    let workflowReportItemRepository: any;
    let configService: any;

    beforeEach(() => {
        workflowReportRepository = {
            save: jest.fn(async (value) => value),
            update: jest.fn(async () => ({ affected: 1 })),
            createQueryBuilder: jest.fn(),
            findOneBy: jest.fn(),
            existsBy: jest.fn(),
            delete: jest.fn(),
        };
        workflowReportItemRepository = {
            save: jest.fn(async (value) => value),
        };
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

    it('stores validation workflow references with workflow_type', async () => {
        const validationWorkflow = { id: 19, label: 'Validation WF', version: 1 };

        const report = await service.createReport({
            workflow_type: WorkflowType.VALIDATION,
            workflow: validationWorkflow as any,
            params: { foo: 'bar' },
        } as any);

        expect(workflowReportRepository.save).toHaveBeenCalledWith(expect.objectContaining({
            workflow_type: WorkflowType.VALIDATION,
            validationWorkflow,
            importWorkflow: undefined,
            exportWorkflow: undefined,
            progress: 0,
        }));
        expect(report.workflow).toBe(validationWorkflow);
        expect(report.workflowId).toBe(19);
    });

    it('hydrates workflow references for export report lists', async () => {
        const queryBuilder = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            addOrderBy: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
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

    it('hydrates workflow references for validation report lists', async () => {
        const queryBuilder = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            addOrderBy: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            getMany: jest.fn(async () => [{
                id: 6,
                workflow_type: WorkflowType.VALIDATION,
                validationWorkflow: { id: 11, label: 'Validation', version: 1 },
            }]),
        };
        workflowReportRepository.createQueryBuilder.mockReturnValue(queryBuilder);

        const reports = await service.getReports(11, WorkflowType.VALIDATION);

        expect(reports[0].workflow).toMatchObject({ id: 11, label: 'Validation', version: 1 });
        expect(reports[0].workflowId).toBe(11);
    });

    it('applies limit and offset when loading paged workflow reports', async () => {
        const queryBuilder = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            addOrderBy: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            getMany: jest.fn(async () => []),
        };
        workflowReportRepository.createQueryBuilder.mockReturnValue(queryBuilder);

        await service.getReports(12, WorkflowType.IMPORT, { limit: 5, offset: 10 });

        expect(queryBuilder.skip).toHaveBeenCalledWith(10);
        expect(queryBuilder.take).toHaveBeenCalledWith(5);
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

    it('touches only updated_at when writing report log items', async () => {
        const timestamp = new Date('2026-03-20T10:00:00.000Z');

        const item = await service.write(31, {
            timestamp,
            level: 'warning' as any,
            code: 'warn-code',
            message: 'Something happened',
        } as any);

        expect(workflowReportRepository.update).toHaveBeenCalledWith(
            { id: 31 },
            { updated_at: expect.any(Date) }
        );
        expect(workflowReportRepository.save).not.toHaveBeenCalled();
        expect(workflowReportItemRepository.save).toHaveBeenCalledWith(expect.objectContaining({
            workflowReport: { id: 31 },
            timestamp,
            level: 'warning',
            code: 'warn-code',
            message: 'Something happened',
        }));
        expect(item).toMatchObject({
            workflowReport: { id: 31 },
            timestamp,
            code: 'warn-code',
            message: 'Something happened',
        });
    });

    it('returns initialized when a workflow has no reports', async () => {
        const queryBuilder = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            addOrderBy: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            getMany: jest.fn(async () => []),
        };
        workflowReportRepository.createQueryBuilder.mockReturnValue(queryBuilder);

        const status = await service.getStatusForWorkflow(9, WorkflowType.IMPORT);

        expect(status).toEqual({
            progress: 0,
            status: 'initialized',
        });
        expect(queryBuilder.take).toHaveBeenCalledWith(1);
    });

    it('uses only the latest workflow report for status polling', async () => {
        const now = new Date();
        const queryBuilder = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            addOrderBy: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            getMany: jest.fn(async () => [
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
        expect(queryBuilder.take).toHaveBeenCalledWith(1);
    });

    it('marks the latest workflow report as stale when it timed out', async () => {
        const now = new Date();
        const staleTimestamp = new Date(now.getTime() - 6 * 60 * 1000);
        const queryBuilder = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            addOrderBy: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
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
            ]),
        };
        workflowReportRepository.createQueryBuilder.mockReturnValue(queryBuilder);

        const status = await service.getStatusForWorkflow(4, WorkflowType.IMPORT);

        expect(status).toEqual({
            progress: 0,
            status: 'Started on Thu Mar 19 2026 07:00:00 GMT+0100 [stale]',
            stale: true,
            reportId: 12,
        });
        expect(configService.get).toHaveBeenCalledWith('lock_timeout');
        expect(queryBuilder.take).toHaveBeenCalledWith(1);
    });

    it('returns a stale status when only stale unfinished workflow reports exist', async () => {
        const staleTimestamp = new Date(Date.now() - 6 * 60 * 1000);
        const queryBuilder = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            addOrderBy: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
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

    it('resolves stale reports by default when waiting for completion', async () => {
        const staleTimestamp = new Date(Date.now() - 6 * 60 * 1000);
        workflowReportRepository.findOneBy.mockResolvedValue({
            id: 21,
            workflow_type: WorkflowType.IMPORT,
            status: 'Started',
            progress: -1,
            updated_at: staleTimestamp,
            finished_at: null,
        });

        const report = await service.waitForCompletion(21, 0);

        expect(report.id).toBe(21);
        expect(report.finished_at).toBeNull();
    });

    it('ignores stale reports when allowStale is false and waits for finished_at', async () => {
        const staleTimestamp = new Date(Date.now() - 6 * 60 * 1000);
        const finishedAt = new Date();
        workflowReportRepository.findOneBy
            .mockResolvedValueOnce({
                id: 22,
                workflow_type: WorkflowType.IMPORT,
                status: 'Started',
                progress: -1,
                updated_at: staleTimestamp,
                finished_at: null,
            })
            .mockResolvedValueOnce({
                id: 22,
                workflow_type: WorkflowType.IMPORT,
                status: 'Finished',
                progress: 0,
                updated_at: finishedAt,
                finished_at: finishedAt,
            });
        const sleepSpy = jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

        const report = await service.waitForCompletion(22, 0, { allowStale: false });

        expect(workflowReportRepository.findOneBy).toHaveBeenCalledTimes(2);
        expect(sleepSpy).toHaveBeenCalledTimes(1);
        expect(report.finished_at).toBe(finishedAt);
    });

    it('aborts waitForCompletion when the abort signal is triggered', async () => {
        const staleTimestamp = new Date(Date.now() - 6 * 60 * 1000);
        const controller = new AbortController();
        workflowReportRepository.findOneBy.mockResolvedValue({
            id: 23,
            workflow_type: WorkflowType.IMPORT,
            status: 'Started',
            progress: -1,
            updated_at: staleTimestamp,
            finished_at: null,
        });

        const completionPromise = service.waitForCompletion(23, 50, {
            allowStale: false,
            signal: controller.signal,
        });
        controller.abort('test-abort');

        await expect(completionPromise).rejects.toMatchObject({
            name: 'AbortError',
        });
    });

    it('rejects deleting a workflow report while completion waiting is active', async () => {
        service.registerCompletionWait(44);

        await expectApiError(service.deleteReport(44), {
            statusCode: 409,
            code: ApiErrorCode.WORKFLOW_RUNNING,
        });
        expect(workflowReportRepository.delete).not.toHaveBeenCalled();
    });
});
