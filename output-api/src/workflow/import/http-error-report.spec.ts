import { throwError } from 'rxjs';
import { CrossrefImportService } from './crossref-import.service';
import { formatHttpErrorForReport } from './http-error-report';

const rateLimitError = {
    message: 'Request failed with status code 429',
    code: 'ERR_BAD_REQUEST',
    response: {
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
            'X-Rate-Limit-Limit': '50',
            'X-Rate-Limit-Interval': '1s',
            'X-Rate-Limit-Type': 'global',
            'X-Concurrency-Limit': '3',
            'Retry-After': '60',
            'Set-Cookie': 'must-not-be-logged',
        },
    },
};

describe('formatHttpErrorForReport', () => {
    it('formats status, message, and allow-listed rate-limit headers', () => {
        const result = formatHttpErrorForReport(rateLimitError);

        expect(result).toContain('HTTP request failed with status 429 Too Many Requests');
        expect(result).toContain('code: ERR_BAD_REQUEST');
        expect(result).toContain('message: Request failed with status code 429');
        expect(result).toContain('x-rate-limit-limit: 50');
        expect(result).toContain('x-rate-limit-interval: 1s');
        expect(result).toContain('x-rate-limit-type: global');
        expect(result).toContain('x-concurrency-limit: 3');
        expect(result).toContain('retry-after: 60');
        expect(result).not.toContain('must-not-be-logged');
    });

    it('supports Axios-style header accessors', () => {
        const result = formatHttpErrorForReport({
            message: 'rate limited',
            response: {
                status: 429,
                headers: {
                    values: { 'retry-after': '15' },
                    get(this: { values: Record<string, string> }, name: string) {
                        return this.values[name];
                    },
                },
            },
        });

        expect(result).toContain('retry-after: 15');
    });

    it('states explicitly when a 429 response has no rate-limit headers', () => {
        const result = formatHttpErrorForReport({
            message: 'Request failed with status code 429',
            response: {
                status: 429,
                statusText: 'Too Many Requests',
                headers: {},
            },
        });

        expect(result).toContain('Rate-limit headers: not provided');
    });

    it('does not add the missing-header note to unrelated HTTP errors', () => {
        const result = formatHttpErrorForReport({
            message: 'Internal Server Error',
            response: {
                status: 500,
                headers: {},
            },
        });

        expect(result).not.toContain('Rate-limit headers: not provided');
    });
});

describe('legacy API import HTTP errors', () => {
    it('writes HTTP failures to the legacy run report before finishing it', async () => {
        const service = Object.create(CrossrefImportService.prototype);
        const reportService = {
            createReport: jest.fn(async () => 'report.log'),
            write: jest.fn(),
            finish: jest.fn(),
        };
        service.progress = 0;
        service.params = [];
        service.url = 'https://api.crossref.org/works?';
        service.max_res = 20;
        service.max_res_name = 'rows';
        service.offset_name = 'offset';
        service.offset_count = 0;
        service.offset_start = 0;
        service.name = 'Crossref';
        service.reportService = reportService;
        service.http = { get: jest.fn(() => throwError(() => rateLimitError)) };

        await service.import(false, 'tester');
        await new Promise(resolve => setImmediate(resolve));

        expect(reportService.write).toHaveBeenCalledWith('report.log', expect.objectContaining({
            type: 'error',
            text: expect.stringContaining('HTTP request failed with status 429 Too Many Requests'),
        }));
        expect(reportService.finish).toHaveBeenCalledWith('report.log', expect.objectContaining({
            status: expect.stringContaining('Error while importing'),
        }));
        expect(service.status_text).toContain('Error while importing');
    });
});
