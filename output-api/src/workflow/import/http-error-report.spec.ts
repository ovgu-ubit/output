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
            'Request-Id': 'request-429',
            'RateLimit': '"default";r=0;t=60',
            'RateLimit-Policy': '"default";q=50;w=60',
            'RateLimit-Limit': '50',
            'RateLimit-Remaining': '0',
            'RateLimit-Reset': '60',
            'X-Rate-Limit-Limit': '50',
            'X-Rate-Limit-Remaining': '0',
            'X-Rate-Limit-Reset': '60',
            'X-Rate-Limit-Interval': '1s',
            'X-Rate-Limit-Type': 'global',
            'X-RateLimit-Limit': '50',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': '60',
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
        expect(result).toContain('request-id: request-429');
        expect(result).toContain('ratelimit: "default";r=0;t=60');
        expect(result).toContain('ratelimit-policy: "default";q=50;w=60');
        expect(result).toContain('ratelimit-limit: 50');
        expect(result).toContain('ratelimit-remaining: 0');
        expect(result).toContain('ratelimit-reset: 60');
        expect(result).toContain('x-rate-limit-limit: 50');
        expect(result).toContain('x-rate-limit-remaining: 0');
        expect(result).toContain('x-rate-limit-reset: 60');
        expect(result).toContain('x-rate-limit-interval: 1s');
        expect(result).toContain('x-rate-limit-type: global');
        expect(result).toContain('x-ratelimit-limit: 50');
        expect(result).toContain('x-ratelimit-remaining: 0');
        expect(result).toContain('x-ratelimit-reset: 60');
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
                headers: { 'x-request-id': 'request-without-limits' },
            },
        });

        expect(result).toContain('x-request-id: request-without-limits');
        expect(result).toContain('Rate-limit headers: not provided');
    });

    it.each([
        [401, { 'www-authenticate': 'Bearer realm="api"' }, ['www-authenticate: Bearer realm="api"']],
        [403, { 'www-authenticate': 'Bearer error="insufficient_scope"' }, ['www-authenticate: Bearer error="insufficient_scope"']],
        [405, { allow: 'GET, HEAD' }, ['allow: GET, HEAD']],
        [407, { 'proxy-authenticate': 'Basic realm="proxy"' }, ['proxy-authenticate: Basic realm="proxy"']],
        [413, { 'retry-after': '120' }, ['retry-after: 120']],
        [415, { accept: 'application/json', 'accept-encoding': 'gzip' }, ['accept: application/json', 'accept-encoding: gzip']],
        [416, { 'content-range': 'bytes */1024' }, ['content-range: bytes */1024']],
        [426, { upgrade: 'HTTP/2.0' }, ['upgrade: HTTP/2.0']],
        [502, { 'proxy-status': 'proxy.example; error=connection_timeout' }, ['proxy-status: proxy.example; error=connection_timeout']],
        [503, { 'proxy-status': 'proxy.example; error=http_protocol_error', 'retry-after': '30' }, ['proxy-status: proxy.example; error=http_protocol_error', 'retry-after: 30']],
        [504, { 'proxy-status': 'proxy.example; error=http_response_timeout' }, ['proxy-status: proxy.example; error=http_response_timeout']],
    ])('reports headers relevant to status %i', (status, headers, expectedHeaders) => {
        const result = formatHttpErrorForReport({ response: { status, headers } });

        for (const expectedHeader of expectedHeaders) expect(result).toContain(expectedHeader);
    });

    it('reports diagnostic headers for every HTTP error', () => {
        const result = formatHttpErrorForReport({
            response: {
                status: 500,
                headers: {
                    'Request-Id': 'request-id-value',
                    'X-Request-Id': 'x-request-id-value',
                    'X-Correlation-Id': 'correlation-id-value',
                    Traceparent: '00-trace-parent-value',
                },
            },
        });

        expect(result).toContain('request-id: request-id-value');
        expect(result).toContain('x-request-id: x-request-id-value');
        expect(result).toContain('x-correlation-id: correlation-id-value');
        expect(result).toContain('traceparent: 00-trace-parent-value');
    });

    it('does not report rate-limit or unrelated headers for a 404', () => {
        const result = formatHttpErrorForReport({
            response: {
                status: 404,
                headers: {
                    'x-request-id': 'request-404',
                    'x-rate-limit-limit': '10',
                    'x-rate-limit-interval': '1s',
                    'x-concurrency-limit': '3',
                    allow: 'GET',
                },
            },
        });

        expect(result).toContain('x-request-id: request-404');
        expect(result).not.toContain('x-rate-limit-limit');
        expect(result).not.toContain('x-rate-limit-interval');
        expect(result).not.toContain('x-concurrency-limit');
        expect(result).not.toContain('allow:');
    });

    it('never reports sensitive or unknown headers', () => {
        const result = formatHttpErrorForReport({
            response: {
                status: 429,
                headers: {
                    authorization: 'Bearer secret',
                    'proxy-authorization': 'Basic secret',
                    cookie: 'secret-cookie',
                    'set-cookie': 'secret-set-cookie',
                    'authentication-info': 'secret-auth-info',
                    'x-unknown-header': 'unknown-value',
                },
            },
        });

        expect(result).not.toContain('secret');
        expect(result).not.toContain('unknown-value');
    });

    it('normalizes line breaks and limits individual header values to 500 characters', () => {
        const resultWithLineBreaks = formatHttpErrorForReport({
            response: {
                status: 500,
                headers: { 'x-request-id': 'first\r\nsecond' },
            },
        });
        const resultWithLongHeader = formatHttpErrorForReport({
            response: {
                status: 500,
                headers: { 'x-request-id': 'x'.repeat(501) },
            },
        });
        const loggedLongValue = resultWithLongHeader.split('x-request-id: ')[1];

        expect(resultWithLineBreaks).toContain('x-request-id: first second');
        expect(resultWithLineBreaks).not.toMatch(/[\r\n]/);
        expect(loggedLongValue).toHaveLength(500);
        expect(loggedLongValue.endsWith('…')).toBe(true);
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
