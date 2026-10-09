const DIAGNOSTIC_HEADERS = [
    'request-id',
    'x-request-id',
    'x-correlation-id',
    'traceparent',
] as const;

const RATE_LIMIT_HEADERS = [
    'x-rate-limit-limit',
    'x-rate-limit-interval',
    'x-rate-limit-type',
    'x-concurrency-limit',
    'retry-after',
    'x-rate-limit-remaining',
    'x-rate-limit-reset',
    'x-ratelimit-limit',
    'x-ratelimit-remaining',
    'x-ratelimit-reset',
    'ratelimit',
    'ratelimit-policy',
    'ratelimit-limit',
    'ratelimit-remaining',
    'ratelimit-reset',
] as const;

const STATUS_SPECIFIC_HEADERS: Readonly<Record<number, readonly string[]>> = {
    401: ['www-authenticate'],
    403: ['www-authenticate'],
    405: ['allow'],
    407: ['proxy-authenticate'],
    413: ['retry-after'],
    415: ['accept', 'accept-encoding'],
    416: ['content-range'],
    426: ['upgrade'],
    429: RATE_LIMIT_HEADERS,
    502: ['proxy-status'],
    503: ['proxy-status', 'retry-after'],
    504: ['proxy-status'],
};

const MAX_HEADER_VALUE_LENGTH = 500;

type HttpErrorLike = {
    message?: unknown;
    code?: unknown;
    response?: {
        status?: unknown;
        statusText?: unknown;
        headers?: unknown;
    };
};

export function formatHttpErrorForReport(error: unknown): string {
    const httpError = isRecord(error) ? error as HttpErrorLike : undefined;
    const response = httpError?.response;
    const status = formatValue(response?.status);
    const statusCode = parseStatusCode(response?.status);
    const statusText = formatValue(response?.statusText);
    const message = formatValue(httpError?.message) ?? formatUnknownError(error);
    const code = formatValue(httpError?.code);

    let result = status
        ? `HTTP request failed with status ${status}${statusText ? ` ${statusText}` : ''}`
        : 'HTTP request failed';

    const details = [code ? `code: ${code}` : undefined, message ? `message: ${message}` : undefined]
        .filter((value): value is string => !!value);
    if (details.length) result += ` (${details.join(', ')})`;

    const reportableHeaders = [
        ...DIAGNOSTIC_HEADERS,
        ...(statusCode === undefined ? [] : STATUS_SPECIFIC_HEADERS[statusCode] ?? []),
    ];
    const headers = [...new Set(reportableHeaders)].flatMap(name => {
        const value = readHeader(response?.headers, name);
        return value === undefined ? [] : [`${name}: ${value}`];
    });
    if (headers.length) result += `. Headers: ${headers.join(', ')}`;

    if (statusCode === 429 && !hasAnyHeader(response?.headers, RATE_LIMIT_HEADERS)) {
        result += '. Rate-limit headers: not provided';
    }

    return result;
}

export function isHttpRequestError(error: unknown): boolean {
    if (!isRecord(error)) return false;
    return isRecord(error.response) || typeof error.code === 'string' || error.name === 'AxiosError';
}

function readHeader(headers: unknown, name: string): string | undefined {
    if (!headers) return undefined;

    if (isRecord(headers) && typeof headers.get === 'function') {
        const value = (headers.get as (headerName: string) => unknown).call(headers, name);
        const formatted = formatHeaderValue(value);
        if (formatted !== undefined) return formatted;
    }

    if (!isRecord(headers)) return undefined;
    const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name);
    return formatHeaderValue(entry?.[1]);
}

function hasAnyHeader(headers: unknown, names: readonly string[]): boolean {
    return names.some(name => readHeader(headers, name) !== undefined);
}

function formatHeaderValue(value: unknown): string | undefined {
    const formatted = formatValue(value);
    if (formatted === undefined) return undefined;

    const singleLine = formatted.replace(/[\r\n]+/g, ' ');
    if (singleLine.length <= MAX_HEADER_VALUE_LENGTH) return singleLine;
    return `${singleLine.slice(0, MAX_HEADER_VALUE_LENGTH - 1)}…`;
}

function formatValue(value: unknown): string | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (Array.isArray(value)) return value.map(item => String(item)).join(', ');
    return String(value);
}

function formatUnknownError(error: unknown): string | undefined {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return undefined;
}

function parseStatusCode(value: unknown): number | undefined {
    const statusCode = Number(value);
    return Number.isInteger(statusCode) ? statusCode : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}
