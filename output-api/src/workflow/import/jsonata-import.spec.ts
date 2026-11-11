import { HttpException } from '@nestjs/common';
import { firstValueFrom, of, throwError } from 'rxjs';
import {  ApiErrorCode, ImportStrategy  } from '@output/interfaces';
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

describe('JSONataImportService URL parameters', () => {
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
        const result = await service.setParameters('https://example.test?term=[year]\\[dp\\]+and+');

        expect(result).toBe('https://example.test?term=2024[dp]+and+');
    });

    it('preserves escaped bracket expressions after replacing search tags', async () => {
        const result = await service.setParameters('[search_tags]\\[affiliation\\]');

        expect(result).toBe('foo+or+bar[affiliation]');
    });

    it('joins array placeholders with the configured separator operation', async () => {
        configService.get.mockImplementation(async (key: string) => {
            if (key === 'openalex_id') return ['I123', 'I456'];
            return null;
        });

        const result = await service.setParameters('https://example.test?filter=institutions.id:[openalex_id|join:%7C]');

        expect(result).toBe('https://example.test?filter=institutions.id:I123%7CI456');
        expect(configService.get).toHaveBeenCalledWith('openalex_id');
    });

    it('leaves atomic values unchanged when join is applied', async () => {
        configService.get.mockImplementation(async (key: string) => {
            if (key === 'openalex_id') return 'I123';
            return null;
        });

        const result = await service.setParameters('https://example.test?filter=institutions.id:[openalex_id|join:%7C]');

        expect(result).toBe('https://example.test?filter=institutions.id:I123');
    });

    it('allows literal pipe separators in join operations', async () => {
        configService.get.mockImplementation(async (key: string) => {
            if (key === 'openalex_id') return ['I123', 'I456'];
            return null;
        });

        const result = await service.setParameters('https://example.test?filter=institutions.id:[openalex_id|join:|]');

        expect(result).toBe('https://example.test?filter=institutions.id:I123|I456');
    });

    it('unescapes literal brackets in safe mode as well', async () => {
        const result = await service.setParameters('https://example.test/[year]\\[dp\\]', true);

        expect(result).toBe('https://example.test/2024[dp]');
    });

    it('does not resolve free config placeholders in safe URLs', async () => {
        configService.get.mockImplementation(async (key: string) => {
            if (key === 'SECRET_SCOPUS') return 'real-secret';
            if (key === 'openalex_id') return ['I123', 'I456'];
            return null;
        });

        const result = await (service as any).getSafeUrl(
            'https://example.test?apiKey=[SECRET_SCOPUS]&filter=[openalex_id|join:%7C]&year=[year]&doi=[doi]',
            { doi: '10.123/test' }
        );

        expect(result).toBe('https://example.test?apiKey=[SECRET_SCOPUS]&filter=[openalex_id|join:%7C]&year=2024&doi=10.123/test');
        expect(configService.get).not.toHaveBeenCalledWith('SECRET_SCOPUS');
        expect(configService.get).not.toHaveBeenCalledWith('openalex_id');
    });

    it('does not expose resolved secrets in workflow test source URLs', async () => {
        configService.get.mockImplementation(async (key: string) => {
            if (key === 'SECRET_SCOPUS') return 'real-secret';
            return null;
        });
        http.get.mockReturnValue(of({ data: { item: {} } }));

        const templateUrl = 'https://example.test?apiKey=[SECRET_SCOPUS]&doi=[doi]';
        (service as any).workflowReport = { id: 22 };
        (service as any).workflowReportService = {
            save: jest.fn(async (_report: unknown) => ({ id: 22 })),
        };
        (service as any).publicationService = {
            get: jest.fn(async () => [{ doi: '10.123/test' }]),
        };
        (service as any).importDefinition = {
            workflow_id: 1,
            strategy_type: ImportStrategy.URL_DOI,
            strategy: {
                url_doi: templateUrl,
            },
        };
        (service as any).url_doi = await service.setParameters(templateUrl);
        jest.spyOn(service as any, 'getDataEnrich').mockResolvedValue({ title: 'Title', doi: '10.123/test' });

        const result = await service.test();

        expect(http.get).toHaveBeenCalledWith('https://example.test?apiKey=real-secret&doi=10.123/test');
        expect(result.read.source).toBe('https://example.test?apiKey=[SECRET_SCOPUS]&doi=10.123/test');
    });

    it('keeps throwing for missing unescaped placeholders', async () => {
        await expectApiError(service.setParameters('https://example.test/[missing]'), {
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

        await expectApiError(service.setParameters('https://example.test/[openalex_id|first]'), {
            statusCode: 400,
            code: ApiErrorCode.INVALID_REQUEST,
            message: 'operation for openalex_id is not supported',
        });
    });

    it('keeps runtime placeholders during parameter replacement', async () => {
        const result = await service.setParameters('https://example.test/[doi]/[id]/[lookup_id]?offset=[offset]&page=[page]');

        expect(result).toBe('https://example.test/[doi]/[id]/[lookup_id]?offset=[offset]&page=[page]');
        expect(configService.get).not.toHaveBeenCalledWith('doi');
        expect(configService.get).not.toHaveBeenCalledWith('id');
        expect(configService.get).not.toHaveBeenCalledWith('lookup_id');
        expect(configService.get).not.toHaveBeenCalledWith('offset');
        expect(configService.get).not.toHaveBeenCalledWith('page');
    });

    it('applies runtime variables after parameter replacement', async () => {
        const query = await service.setParameters('https://example.test/[doi]/[id]?offset=[offset]&page=[page]\\[dp\\]');
        const result = (service as any).applyVariables(
            query,
            { offset: 100, page: 3, doi: '10.123/test', id: 'item-1' },
            true
        );

        expect(result).toBe('https://example.test/10.123/test/item-1?offset=100&page=3[dp]');
    });

    it('surfaces JSONata get_items errors as invalid request errors', async () => {
        (service as any).importDefinition = {
            strategy: {
                format: 'json',
                get_items: '$.items[',
            },
        };

        try {
            await (service as any).getData({ data: { items: [] } });
            fail('Expected getData to reject with an API error');
        } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getResponse()).toMatchObject({
                statusCode: 400,
                code: ApiErrorCode.INVALID_REQUEST,
                message: expect.stringContaining('JSONata expression for strategy.get_items failed'),
                details: [
                    expect.objectContaining({
                        path: 'strategy.get_items',
                        code: 'jsonata',
                    }),
                ],
            });
        }
    });

    it('surfaces non-array get_items results as invalid request errors', async () => {
        (service as any).importDefinition = {
            strategy: {
                format: 'json',
                get_items: '$.item',
            },
        };

        await expectApiError((service as any).getData({ data: { item: { title: 'Single item' } } }), {
            statusCode: 400,
            code: ApiErrorCode.INVALID_REQUEST,
            message: 'JSONata expression for strategy.get_items must return an array.',
        });
    });

    it('delays lookup requests and resolves paging placeholders from the URL', async () => {
        jest.useFakeTimers();
        const response = { data: { ok: true } };
        http.get.mockReturnValue(of(response));

        (service as any).max_res = 1000;
        (service as any).lookupURL = await service.setParameters('https://example.test/search?retmax=[max_res]&retstart=[offset]');
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
        expect(http.get).toHaveBeenCalledWith('https://example.test/search?retmax=1000&retstart=100');

        await expect(promise).resolves.toBe(response);
        expect(resolved).toBe(true);
        jest.useRealTimers();
    });

    it('resolves page placeholders in item requests without legacy parameter fields', async () => {
        jest.useFakeTimers();
        const response = { data: { ok: true } };
        http.get.mockReturnValue(of(response));

        (service as any).max_res = 25;
        (service as any).url = await service.setParameters('https://example.test/items?rows=[max_res]&page=[page]');
        (service as any).delayInMs = 0;

        const promise = firstValueFrom((service as any).request(undefined, 3));
        jest.advanceTimersByTime(0);
        await Promise.resolve();

        expect(http.get).toHaveBeenCalledWith('https://example.test/items?rows=25&page=3');
        await expect(promise).resolves.toBe(response);
        jest.useRealTimers();
    });

    it('keeps legacy lookup pagination fields working when URLs have no placeholders', async () => {
        jest.useFakeTimers();
        const response = { data: { ok: true } };
        http.get.mockReturnValue(of(response));

        (service as any).lookupURL = 'https://example.test/search?term=test';
        (service as any).max_res = 1000;
        (service as any).max_res_name = 'retmax';
        (service as any).offset_name = 'retstart';
        (service as any).useLegacyLimitParameter = true;
        (service as any).useLegacyCursorParameter = true;
        (service as any).delayInMs = 0;

        const promise = firstValueFrom((service as any).retrieveLookupRequest(100));
        jest.advanceTimersByTime(0);
        await Promise.resolve();

        expect(http.get).toHaveBeenCalledWith('https://example.test/search?term=test&retmax=1000&retstart=100');
        await expect(promise).resolves.toBe(response);
        jest.useRealTimers();
    });

    it('keeps legacy item pagination fields working when URLs have no placeholders', async () => {
        jest.useFakeTimers();
        const response = { data: { ok: true } };
        http.get.mockReturnValue(of(response));

        (service as any).url = 'https://example.test/items?term=test';
        (service as any).max_res = 25;
        (service as any).max_res_name = 'rows';
        (service as any).offset_name = 'offset';
        (service as any).useLegacyLimitParameter = true;
        (service as any).useLegacyCursorParameter = true;
        (service as any).delayInMs = 0;

        const promise = firstValueFrom((service as any).request(50));
        jest.advanceTimersByTime(0);
        await Promise.resolve();

        expect(http.get).toHaveBeenCalledWith('https://example.test/items?term=test&rows=25&offset=50');
        await expect(promise).resolves.toBe(response);
        jest.useRealTimers();
    });

    it('keeps legacy count offset fields working when count URLs have no placeholders', async () => {
        const response = { data: { ok: true } };
        http.get.mockReturnValue(of(response));

        (service as any).url_count = 'https://example.test/count?term=test';
        (service as any).offset_name = 'offset';
        (service as any).offset_count = 0;
        (service as any).useLegacyCursorParameter = true;

        await expect(firstValueFrom((service as any).retrieveCountRequest())).resolves.toBe(response);
        expect(http.get).toHaveBeenCalledWith('https://example.test/count?term=test&offset=0');
    });

    it('keeps legacy count page fields working when count URLs have no placeholders', async () => {
        const response = { data: { ok: true } };
        http.get.mockReturnValue(of(response));

        (service as any).url_count = 'https://example.test/count?term=test';
        (service as any).mode = 'page';
        (service as any).offset_name = 'page';
        (service as any).offset_count = 1;
        (service as any).useLegacyCursorParameter = true;

        await expect(firstValueFrom((service as any).retrieveCountRequest())).resolves.toBe(response);
        expect(http.get).toHaveBeenCalledWith('https://example.test/count?term=test&page=1');
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

    it('writes JSONata extraction errors into the workflow report', async () => {
        (service as any).importDefinition.strategy.get_items = '$.items[';
        jest.spyOn(service as any, 'retrieveCountRequest').mockReturnValue(of({ data: { count: 1 } } as any));
        jest.spyOn(service as any, 'getNumber').mockResolvedValue(1);
        jest.spyOn(service as any, 'request').mockReturnValue(of({ data: { items: [{ title: 'First' }] } } as any));

        await service.import(false, 'tester', false);
        await new Promise((resolve) => setImmediate(resolve));

        expect(workflowReportService.write).toHaveBeenCalledWith(11, expect.objectContaining({
            level: 'error',
            message: expect.stringContaining('JSONata expression for strategy.get_items failed'),
        }));
    });

    it('writes count request errors and rate-limit headers into the workflow report', async () => {
        const error = {
            message: 'Request failed with status code 429',
            response: {
                status: 429,
                statusText: 'Too Many Requests',
                headers: {
                    'x-rate-limit-limit': '100',
                    'x-rate-limit-interval': '1s',
                    'x-rate-limit-type': 'global',
                    'x-concurrency-limit': '5',
                    'retry-after': '30',
                    authorization: 'must-not-be-logged',
                },
            },
        };
        jest.spyOn(service as any, 'retrieveCountRequest').mockReturnValue(throwError(() => error));

        await service.import(false, 'tester', false);

        expect(workflowReportService.write).toHaveBeenCalledWith(11, expect.objectContaining({
            level: 'error',
            message: expect.stringMatching(/HTTP request failed with status 429 Too Many Requests.*x-rate-limit-limit: 100.*x-rate-limit-interval: 1s.*x-rate-limit-type: global.*x-concurrency-limit: 5.*retry-after: 30/),
        }));
        expect(workflowReportService.write.mock.calls.flat().join(' ')).not.toContain('must-not-be-logged');
        expect(workflowReportService.finish).toHaveBeenCalledWith(11, expect.objectContaining({
            status: 'Error while importing',
        }));
    });

    it('logs a safe failed enrich URL and continues with remaining DOI requests', async () => {
        const failedRequest = {
            message: 'Request failed with status code 404',
            code: 'ERR_BAD_REQUEST',
            response: {
                status: 404,
                statusText: 'Not Found',
                headers: {
                    'x-rate-limit-limit': '10',
                    'x-rate-limit-interval': '1s',
                    'x-concurrency-limit': '3',
                },
            },
        };
        (service as any).publicationService = {
            get: jest.fn(async () => [
                { doi: '10.123/missing', locked: false },
                { doi: '10.123/found', locked: false },
            ]),
        };
        (service as any).publicationIndexService.getPubwithDOIorTitle.mockResolvedValue({
            id: 42,
            locked: true,
        });
        (service as any).importDefinition = {
            strategy: {
                url_doi: 'https://api.crossref.test/works/[doi]?mailto=[SECRET_CROSSREF]',
                get_doi_item: '$.message',
            },
        };
        (service as any).url_doi = 'https://api.crossref.test/works/[doi]?mailto=real-secret';
        (service as any).delayInMs = 0;
        (service as any).parallelCalls = 1;
        http.get.mockImplementation((url: string) => url.includes('/missing')
            ? throwError(() => failedRequest)
            : of({ data: { message: { DOI: '10.123/found', title: 'Found' } } }));
        jest.spyOn(service as any, 'getDataEnrich').mockResolvedValue({
            doi: '10.123/found',
            title: 'Found',
        });

        await service.enrich('tester', false);
        await new Promise((resolve) => setTimeout(resolve, 25));

        expect(http.get).toHaveBeenCalledTimes(2);
        expect(workflowReportService.write).toHaveBeenCalledWith(11, expect.objectContaining({
            level: 'error',
            message: expect.stringContaining(
                'Error retrieving enrich data from URL https://api.crossref.test/works/10.123/missing?mailto=[SECRET_CROSSREF]'
            ),
        }));
        expect(workflowReportService.write.mock.calls.flat().join(' ')).not.toContain('real-secret');
        expect(workflowReportService.finish).toHaveBeenCalledWith(11, expect.objectContaining({
            status: 'Successfull enrich',
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


describe('JSONataImportService per-record tag mapping', () => {
    const review = { id: 2, label: 'Rechnung fehlt' };
    let service: JSONataImportService;
    let publications: { save: jest.Mock; planImportTags: jest.Mock };
    let reports: { write: jest.Mock };

    beforeEach(() => {
        publications = {
            save: jest.fn(async pubs => pubs.map(pub => ({ ...pub, id: pub.id ?? 100 }))),
            planImportTags: jest.fn(async () => ({ tags: [review], addTagIds: [2], missingLabels: [] })),
        };
        reports = { write: jest.fn(async () => undefined) };
        service = new JSONataImportService(
            publications as any, { findOrSave: jest.fn() } as any, createPublicationRelationServiceMock() as any,
            { findOrSave: jest.fn() } as any, { findOrSave: jest.fn() } as any,
            { findOrSave: jest.fn(async () => null) } as any,
            { findOrSave: jest.fn(async () => null), findByDOI: jest.fn(async () => null) } as any,
            { findOrSave: () => of(null) } as any, { findOrSave: () => of(null) } as any,
            { findOrSaveCT: () => of(null), findOrSaveCC: () => of(null) } as any,
            { write: jest.fn() } as any, { findOrSave: () => of(null) } as any,
            { findOrSave: jest.fn(async () => null) } as any, { findOrSave: jest.fn(async () => null) } as any,
            { get: async () => ({}) } as any, reports as any, {} as any,
        );
        (service as any).workflowReport = { id: 7 };
        (service as any).updateMapping = Object.fromEntries(Object.keys(service.getUpdateMapping()).map(key => [key, UpdateOptions.IGNORE]));
        jest.spyOn(service as any, 'importTest').mockResolvedValue(true);
    });

    it('evaluates conditional tag expressions independently for each new record', async () => {
        (service as any).importConfig = '{"title": title, "pub_date": date, "tags": $count(invoices) = 0 ? ["Rechnung fehlt"] : []}';
        await service.mapNew(await service.transform({ title: 'Needs invoice', date: '2026-01-01', invoices: [] }));
        await service.mapNew(await service.transform({ title: 'Has invoice', date: '2026-01-01', invoices: [{ number: '1' }] }));
        expect(publications.planImportTags).toHaveBeenCalledTimes(1);
        expect(publications.planImportTags).toHaveBeenCalledWith(['Rechnung fehlt'], undefined);
        expect(publications.save.mock.calls[0][1]).toEqual({ workflowReport: { id: 7 }, addTagIds: [2] });
        expect(publications.save.mock.calls[1][1]).toEqual({ workflowReport: { id: 7 } });
    });

    it('updates existing publications when only a new tag assignment changes', async () => {
        const result = await service.mapUpdate({ tags: ['Rechnung fehlt'] }, { id: 4 } as any);
        expect(result.fields).toEqual(['tags']);
        expect(result.pub.tags).toEqual([review]);
        expect(publications.save).toHaveBeenCalledWith([{ id: 4 }], { workflowReport: { id: 7 }, addTagIds: [2] });
    });

    it('does not save unchanged tag assignments or interpret an empty list as removal', async () => {
        publications.planImportTags.mockResolvedValue({ tags: [review], addTagIds: [], missingLabels: [] });
        expect((await service.mapUpdate({ tags: ['Rechnung fehlt'] }, { id: 4 } as any)).fields).toEqual([]);
        expect((await service.mapUpdate({ tags: [] }, { id: 4 } as any)).fields).toEqual([]);
        expect(publications.save).not.toHaveBeenCalled();
    });

    it('previews tags for new and updated publications without writing assignments', async () => {
        (service as any).dryRun = true;
        expect((await service.mapNew({ title: 'Preview', pub_date: '2026-01-01', tags: ['Rechnung fehlt'] })).tags).toEqual([review]);
        const update = await service.mapUpdate({ tags: ['Rechnung fehlt'] }, { id: 4 } as any);
        expect(update.pub.tags).toEqual([review]);
        expect(update.fields).toContain('tags');
        expect(publications.save).not.toHaveBeenCalled();
    });

    it('warns about unknown labels while retaining resolvable tags', async () => {
        publications.planImportTags.mockResolvedValue({ tags: [review], addTagIds: [2], missingLabels: ['Unknown'] });
        await service.mapNew({ title: 'Example', pub_date: '2026-01-01', tags: ['Rechnung fehlt', 'Unknown'] });
        expect(reports.write).toHaveBeenCalledWith(7, expect.objectContaining({
            code: 'publication-tags', message: expect.stringContaining('Unknown'),
        }));
        expect(publications.save.mock.calls[0][1].addTagIds).toEqual([2]);
    });

    it.each([{ locked: true }, { delete_date: new Date() }])('does not assign tags to unavailable publications: %p', async state => {
        const result = await service.mapUpdate({ tags: ['Rechnung fehlt'] }, { id: 4, ...state } as any);
        expect(result.fields).toEqual([]);
        expect(publications.planImportTags).not.toHaveBeenCalled();
        expect(publications.save).not.toHaveBeenCalled();
    });
});
