import { CompareOperation } from '../../../output-interfaces/Config';
import { WorkflowType } from '../../../output-interfaces/Workflow';
import { ValidationService } from './validation.service';

describe('ValidationService', () => {
    let service: ValidationService;
    let publicationService: {
        getAll: jest.Mock;
    };
    let workflowReportService: {
        createReport: jest.Mock;
        updateStatus: jest.Mock;
        write: jest.Mock;
        finish: jest.Mock;
    };

    beforeEach(() => {
        publicationService = {
            getAll: jest.fn(),
        };
        workflowReportService = {
            createReport: jest.fn(),
            updateStatus: jest.fn(),
            write: jest.fn(),
            finish: jest.fn(),
        };

        workflowReportService.createReport.mockImplementation(async (value) => ({ id: 91, ...value }));
        workflowReportService.updateStatus.mockImplementation(async (id, value) => ({ id, ...value }));
        workflowReportService.write.mockResolvedValue(undefined);
        workflowReportService.finish.mockImplementation(async (id, value) => ({ id, ...value }));

        service = new ValidationService(
            publicationService as never,
            workflowReportService as never,
        );
    });

    it('creates a validation workflow report during setup', async () => {
        await service.setUp({
            id: 7,
            label: 'Validation',
            workflow_id: 'validation-1',
            target: 'publication',
            rules: [{ type: 'required', result: 'error', path: 'doi' }],
        } as any);

        expect(workflowReportService.createReport).toHaveBeenCalledWith(expect.objectContaining({
            workflow_type: WorkflowType.VALIDATION,
            status: 'initialized',
            progress: 0,
            params: expect.objectContaining({
                target: 'publication',
                rule_count: 1,
            }),
        }));
    });

    it('evaluates required, compare and conditional rules and writes findings', async () => {
        publicationService.getAll.mockResolvedValue([
            {
                id: 1,
                title: 'Missing DOI',
                doi: '',
                status: 2,
                oa_category: 'gold',
                license: null,
            },
            {
                id: 2,
                title: 'Clean Publication',
                doi: '10.1000/example',
                status: 1,
                oa_category: 'closed',
                license: null,
            }
        ]);

        await service.setUp({
            id: 8,
            label: 'Validation',
            workflow_id: 'validation-2',
            target: 'publication',
            rules: [
                { type: 'required', result: 'error', path: 'doi' },
                { type: 'compare', result: 'warning', path: 'status', comp: CompareOperation.EQUALS, value: 1 },
                {
                    type: 'conditional',
                    result: 'info',
                    if: { type: 'compare', path: 'oa_category', comp: CompareOperation.EQUALS, value: 'gold' },
                    then: { type: 'required', path: 'license' },
                },
            ],
        } as any);

        const summary = await service.validate('alice');

        expect(publicationService.getAll).toHaveBeenCalledWith(undefined, { serializeDates: true });
        expect(workflowReportService.updateStatus).toHaveBeenCalledWith(91, expect.objectContaining({
            progress: -1,
            status: expect.stringContaining('Started on'),
            by_user: 'alice',
        }));
        expect(workflowReportService.write).toHaveBeenCalledWith(91, expect.objectContaining({
            code: 'validation.selection',
        }));
        expect(workflowReportService.write).toHaveBeenCalledWith(91, expect.objectContaining({
            code: 'validation.required.doi',
            level: 'error',
        }));
        expect(workflowReportService.write).toHaveBeenCalledWith(91, expect.objectContaining({
            code: 'validation.compare.status',
            level: 'warning',
        }));
        expect(workflowReportService.write).toHaveBeenCalledWith(91, expect.objectContaining({
            code: 'validation.conditional',
            level: 'info',
        }));
        expect(workflowReportService.finish).toHaveBeenCalledWith(91, expect.objectContaining({
            status: 'Successful validation',
            summary: expect.objectContaining({
                checked: 2,
                findings: 3,
                info: 1,
                warning: 1,
                error: 1,
            }),
        }));
        expect(summary).toEqual(expect.objectContaining({
            checked: 2,
            findings: 3,
            info: 1,
            warning: 1,
            error: 1,
        }));
    });

    it('writes a clean info entry when validation produces no findings', async () => {
        publicationService.getAll.mockResolvedValue([
            {
                id: 3,
                title: 'Clean',
                doi: '10.1000/clean',
                status: 1,
            }
        ]);

        await service.setUp({
            id: 9,
            label: 'Validation',
            workflow_id: 'validation-3',
            target: 'publication',
            rules: [
                { type: 'required', result: 'error', path: 'doi' },
                { type: 'compare', result: 'warning', path: 'status', comp: CompareOperation.EQUALS, value: 1 },
            ],
        } as any);

        const summary = await service.validate();

        expect(workflowReportService.write).toHaveBeenCalledWith(91, expect.objectContaining({
            code: 'validation.clean',
            level: 'info',
        }));
        expect(summary.findings).toBe(0);
    });

    it('heartbeats clean validation runs during iteration to keep the report active', async () => {
        publicationService.getAll.mockResolvedValue([
            {
                id: 4,
                title: 'Clean A',
                doi: '10.1000/clean-a',
                status: 1,
            },
            {
                id: 5,
                title: 'Clean B',
                doi: '10.1000/clean-b',
                status: 1,
            },
        ]);

        const dateNowSpy = jest.spyOn(Date, 'now')
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(31_000)
            .mockReturnValueOnce(31_000);

        await service.setUp({
            id: 10,
            label: 'Validation',
            workflow_id: 'validation-4',
            target: 'publication',
            rules: [
                { type: 'required', result: 'error', path: 'doi' },
                { type: 'compare', result: 'warning', path: 'status', comp: CompareOperation.EQUALS, value: 1 },
            ],
        } as any);

        await service.validate('alice');

        expect(workflowReportService.updateStatus).toHaveBeenCalledTimes(2);
        expect(workflowReportService.updateStatus).toHaveBeenNthCalledWith(2, 91, expect.objectContaining({
            progress: -1,
        }));

        dateNowSpy.mockRestore();
    });
});
