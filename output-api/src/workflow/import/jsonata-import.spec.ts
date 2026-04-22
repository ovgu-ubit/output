import { HttpException } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { ApiErrorCode } from '../../../../output-interfaces/ApiError';
import { JSONataImportService } from './jsonata-import';

const expectApiError = async (
    promise: Promise<unknown>,
    expected: {
        statusCode: number;
        code: ApiErrorCode;
        message?: string;
    },
) => {
    try {
        await promise;
        fail(`Expected promise to reject with ${expected.code}`);
    } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getResponse()).toMatchObject({
            statusCode: expected.statusCode,
            code: expected.code,
            ...(expected.message ? { message: expected.message } : {}),
        });
    }
};

describe('JSONataImportService.setVariables', () => {
    let service: JSONataImportService;
    let configService: { get: jest.Mock };
    let http: { get: jest.Mock };

    beforeEach(() => {
        configService = {
            get: jest.fn(async (_key: string) => null),
        };
        http = {
            get: jest.fn(),
        };

        service = new JSONataImportService(
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            configService as any,
            {} as any,
            http as any,
        );

        (service as any).reporting_year = '2024';
        (service as any).searchText = 'foo+or+bar';
    });

    it('resolves placeholders and unescapes literal brackets', async () => {
        const result = await service.setVariables('https://example.test?term=[year]\\[dp\\]+and+');

        expect(result).toBe('https://example.test?term=2024[dp]+and+');
    });

    it('preserves escaped bracket expressions after replacing search tags', async () => {
        const result = await service.setVariables('[search_tags]\\[affiliation\\]');

        expect(result).toBe('foo+or+bar[affiliation]');
    });

    it('unescapes literal brackets in safe mode as well', async () => {
        const result = await service.setVariables('https://example.test/[year]\\[dp\\]', undefined, true);

        expect(result).toBe('https://example.test/2024[dp]');
    });

    it('keeps throwing for missing unescaped placeholders', async () => {
        await expectApiError(service.setVariables('https://example.test/[missing]'), {
            statusCode: 400,
            code: ApiErrorCode.INVALID_REQUEST,
            message: 'value for missing is not available',
        });
    });

    it('delays the actual lookup request by delayInMs', async () => {
        jest.useFakeTimers();
        const response = { data: { ok: true } };
        http.get.mockReturnValue(of(response));

        (service as any).lookupURL = 'https://example.test/search';
        (service as any).max_res_name = 'retmax';
        (service as any).max_res = 1000;
        (service as any).offset_name = 'retstart';
        (service as any).delayInMs = 250;

        const promise = firstValueFrom((service as any).retrieveLookupRequest(100));
        let resolved = false;
        promise.then(() => {
            resolved = true;
        });

        await Promise.resolve();
        expect(http.get).not.toHaveBeenCalled();
        expect(resolved).toBe(false);

        jest.advanceTimersByTime(249);
        await Promise.resolve();
        expect(http.get).not.toHaveBeenCalled();

        jest.advanceTimersByTime(1);
        await Promise.resolve();
        expect(http.get).toHaveBeenCalledWith('https://example.test/search&retmax=1000&retstart=100');

        await expect(promise).resolves.toBe(response);
        expect(resolved).toBe(true);
        jest.useRealTimers();
    });
});

describe('JSONataImportService workflow report status', () => {
    let service: JSONataImportService;
    let workflowReportService: {
        updateStatus: jest.Mock;
        finish: jest.Mock;
        write: jest.Mock;
    };
    let http: { get: jest.Mock };

    beforeEach(() => {
        workflowReportService = {
            updateStatus: jest.fn(async (_id, report) => ({ id: 11, params: {}, ...report })),
            finish: jest.fn(async (_id, report) => ({ id: 11, ...report })),
            write: jest.fn(async () => undefined),
        };
        http = {
            get: jest.fn(),
        };

        service = new JSONataImportService(
            {
                checkDOIorTitleAlreadyExists: jest.fn(async () => false),
            } as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {
                get: jest.fn(async () => null),
            } as any,
            workflowReportService as any,
            http as any,
        );

        (service as any).workflowReport = { id: 11, params: {} };
        (service as any).importDefinition = {
            strategy: {
                get_count: '$.count',
                get_items: '$.items',
            },
        };
        (service as any).url = 'https://example.test/items';
        (service as any).url_count = 'https://example.test/count';
        (service as any).max_res_name = 'rows';
        (service as any).max_res = 20;
        (service as any).offset_count = 0;
        (service as any).offset_name = 'offset';
        (service as any).offset_start = 0;
        (service as any).mode = 'offset';
    });

    it('persists started and terminal DB status when no items are found', async () => {
        jest.spyOn(service as any, 'retrieveCountRequest').mockReturnValue(of({ data: { count: 0 } } as any));
        jest.spyOn(service as any, 'getNumber').mockResolvedValue(0);
        jest.spyOn(service as any, 'request').mockReturnValue(of({ data: { items: [] } } as any));
        jest.spyOn(service as any, 'getData').mockResolvedValue([]);

        await service.import(false, 'tester', true);
        await new Promise((resolve) => setImmediate(resolve));

        expect(workflowReportService.updateStatus).toHaveBeenCalledWith(11, expect.objectContaining({
            by_user: 'tester',
            dry_run: true,
            progress: -1,
            status: expect.stringContaining('Started on '),
        }));
        expect(workflowReportService.finish).toHaveBeenCalledWith(11, expect.objectContaining({
            status: 'Nothing to import',
        }));
    });

    it('persists live import progress before finishing', async () => {
        jest.spyOn(service as any, 'retrieveCountRequest').mockReturnValue(of({ data: { count: 1 } } as any));
        jest.spyOn(service as any, 'getNumber').mockResolvedValue(1);
        jest.spyOn(service as any, 'request').mockReturnValue(of({ data: { items: [{ title: 'First' }] } } as any));
        jest.spyOn(service as any, 'getData').mockResolvedValue([{ title: 'First', doi: '10.1/test' }]);
        jest.spyOn(service as any, 'processImportItem').mockResolvedValue(undefined);

        await service.import(false, 'tester', false);
        await new Promise((resolve) => setImmediate(resolve));

        expect(workflowReportService.updateStatus).toHaveBeenCalledWith(11, expect.objectContaining({
            progress: 1,
        }));
        expect(workflowReportService.finish).toHaveBeenCalledWith(11, expect.objectContaining({
            status: 'Successfull import',
        }));
    });
});
