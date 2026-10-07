const REPORTABLE_HEADERS = [
    'x-rate-limit-limit',
    'x-rate-limit-interval',
    'x-rate-limit-type',
    'x-concurrency-limit',
    'retry-after',
] as const;

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
    const statusText = formatValue(response?.statusText);
    const message = formatValue(httpError?.message) ?? formatUnknownError(error);
    const code = formatValue(httpError?.code);

    let result = status
        ? `HTTP request failed with status ${status}${statusText ? ` ${statusText}` : ''}`
        : 'HTTP request failed';

    const details = [code ? `code: ${code}` : undefined, message ? `message: ${message}` : undefined]
        .filter((value): value is string => !!value);
    if (details.length) result += ` (${details.join(', ')})`;

    const headers = REPORTABLE_HEADERS.flatMap(name => {
        const value = readHeader(response?.headers, name);
        return value === undefined ? [] : [`${name}: ${value}`];
    });
    if (headers.length) result += `. Headers: ${headers.join(', ')}`;
    else if (status === '429') result += '. Rate-limit headers: not provided';

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
        const formatted = formatValue(value);
        if (formatted !== undefined) return formatted;
    }

    if (!isRecord(headers)) return undefined;
    const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name);
    return formatValue(entry?.[1]);
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

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}
