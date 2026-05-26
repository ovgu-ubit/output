import { HttpException } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import {  ApiErrorCode  } from '@output/interfaces';
import {  UpdateOptions  } from '@output/interfaces';
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

const createPublicationIndexServiceMock = () => ({
    checkDOIorTitleAlreadyExists: jest.fn(async () => false),
    getPubwithDOIorTitle: jest.fn(async () => null),
    isDOIvalid: jest.fn(() => true),
});

const createPublicationRelationServiceMock = () => ({
    saveAuthorPublication: jest.fn(async () => undefined),
    getAuthorsPublication: jest.fn(async () => []),
    resetAuthorPublication: jest.fn(async () => undefined),
});

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
            createPublicationRelationServiceMock() as any,
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
        (service as any).publicationIndexService = createPublicationIndexServiceMock();

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

    it('joins array placeholders with the configured separator operation', async () => {
        configService.get.mockImplementation(async (key: string) => {
            if (key === 'openalex_id') return ['I123', 'I456'];
            return null;
        });

        const result = await service.setVariables('https://example.test?filter=institutions.id:[openalex_id|join:%7C]');

        expect(result).toBe('https://example.test?filter=institutions.id:I123%7CI456');
        expect(configService.get).toHaveBeenCalledWith('openalex_id');
    });

    it('leaves atomic values unchanged when join is applied', async () => {
        configService.get.mockImplementation(async (key: string) => {
            if (key === 'openalex_id') return 'I123';
            return null;
        });

        const result = await service.setVariables('https://example.test?filter=institutions.id:[openalex_id|join:%7C]');

        expect(result).toBe('https://example.test?filter=institutions.id:I123');
    });

    it('allows literal pipe separators in join operations', async () => {
        configService.get.mockImplementation(async (key: string) => {
            if (key === 'openalex_id') return ['I123', 'I456'];
            return null;
        });

        const result = await service.setVariables('https://example.test?filter=institutions.id:[openalex_id|join:|]');

        expect(result).toBe('https://example.test?filter=institutions.id:I123|I456');
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

    it('throws for unsupported placeholder operations', async () => {
        configService.get.mockImplementation(async (key: string) => {
            if (key === 'openalex_id') return ['I123', 'I456'];
            return null;
        });

        await expectApiError(service.setVariables('https://example.test/[openalex_id|first]'), {
            statusCode: 400,
            code: ApiErrorCode.INVALID_REQUEST,
            message: 'operation for openalex_id is not supported',
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
            {} as any,
            {} as any,
            createPublicationRelationServiceMock() as any,
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
        (service as any).publicationIndexService = createPublicationIndexServiceMock();

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

describe('JSONataImportService optional_fields config usage', () => {
    const createService = (configService: { get: jest.Mock }) => {
        const service = new JSONataImportService(
        {} as any,
        { findOrSave: jest.fn() } as any,
        createPublicationRelationServiceMock() as any,
        { findOrSave: jest.fn() } as any,
        { findOrSave: jest.fn() } as any,
        { findOrSave: jest.fn(async () => null) } as any,
        { findOrSave: jest.fn(async () => null), findByDOI: jest.fn(async () => null) } as any,
        { findOrSave: jest.fn(() => of(null)) } as any,
        { findOrSave: jest.fn(() => of(null)) } as any,
        { findOrSaveCT: jest.fn(() => of(null)), findOrSaveCC: jest.fn(() => of(null)) } as any,
        { write: jest.fn() } as any,
        { findOrSave: jest.fn(() => of(null)) } as any,
        { findOrSave: jest.fn(async () => null) } as any,
        { findOrSave: jest.fn(async () => null) } as any,
        configService as any,
        { write: jest.fn(), updateStatus: jest.fn(), finish: jest.fn() } as any,
        { get: jest.fn() } as any,
        );
        (service as any).publicationIndexService = createPublicationIndexServiceMock();
        return service;
    };

    it('loads optional_fields once in mapNew', async () => {
        const configService = {
            get: jest.fn(async (key: string) => {
                if (key === 'optional_fields') {
                    return {
                        abstract: true,
                        page_count: true,
                        peer_reviewed: true,
                        pub_date_print: true,
                        pub_date_submitted: true,
                    };
                }
                return null;
            }),
        };
        const service = createService(configService);
        (service as any).dryRun = true;
        jest.spyOn(service as any, 'importTest').mockResolvedValue(true);

        await service.mapNew({
            title: 'A title',
            doi: '10.1000/test',
            pub_date: new Date('2024-01-01T00:00:00.000Z'),
            abstract: 'Summary',
            page_count: 12,
            peer_reviewed: true,
        });

        expect(configService.get.mock.calls.filter(([key]) => key === 'optional_fields')).toHaveLength(1);
    });

    it('loads optional_fields once in mapUpdate', async () => {
        const configService = {
            get: jest.fn(async (key: string) => {
                if (key === 'optional_fields') {
                    return {
                        abstract: true,
                        citation: true,
                        page_count: true,
                        peer_reviewed: true,
                        pub_date_print: true,
                        pub_date_submitted: true,
                    };
                }
                return null;
            }),
        };
        const service = createService(configService);
        const ignoreMapping = Object.fromEntries(
            Object.keys(service.getUpdateMapping()).map((key) => [key, UpdateOptions.IGNORE]),
        );
        (service as any).updateMapping = ignoreMapping;
        (service as any).dryRun = true;

        await service.mapUpdate(
            {
                title: 'Updated title',
                doi: '10.1000/test',
                pub_date: new Date('2024-01-01T00:00:00.000Z'),
            },
            {
                id: 1,
                locked_author: true,
                locked_biblio: false,
                locked_oa: true,
                locked_finance: true,
            } as any,
        );

        expect(configService.get.mock.calls.filter(([key]) => key === 'optional_fields')).toHaveLength(1);
    });
});
