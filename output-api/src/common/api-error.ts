import { HttpException, HttpStatus, ValidationError } from '@nestjs/common';
import { ApiErrorCode, ApiErrorDetail, ApiErrorResponse } from '../../../output-interfaces/ApiError';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

type ApiErrorEnvelope = Omit<ApiErrorResponse, 'correlationId' | 'timestamp' | 'path'>;

const DEFAULT_MESSAGES: Record<ApiErrorCode, string> = {
    [ApiErrorCode.VALIDATION_FAILED]: 'Validation failed.',
    [ApiErrorCode.INVALID_REQUEST]: 'Invalid request.',
    [ApiErrorCode.ENTITY_LOCKED]: 'Entity is currently locked.',
    [ApiErrorCode.UNIQUE_CONSTRAINT]: 'Unique constraint violated.',
    [ApiErrorCode.NOT_FOUND]: 'Resource not found.',
    [ApiErrorCode.FORBIDDEN]: 'Forbidden.',
    [ApiErrorCode.UNAUTHENTICATED]: 'Authentication required.',
    [ApiErrorCode.WORKFLOW_RUNNING]: 'Workflow execution already running.',
    [ApiErrorCode.INTERNAL_ERROR]: 'Internal server error.',
};

type MutableRecord = Record<string, unknown>;

export function buildApiErrorEnvelope(
    statusCode: number,
    code: ApiErrorCode,
    options: {
        message?: string;
        details?: ApiErrorDetail[];
    } = {},
): ApiErrorEnvelope {
    const details = normalizeDetails(options.details);
    return {
        statusCode,
        code,
        message: sanitizeMessage(statusCode, code, options.message),
        ...(details.length > 0 ? { details } : {}),
    };
}

export function createApiHttpException(
    statusCode: number,
    code: ApiErrorCode,
    options: {
        message?: string;
        details?: ApiErrorDetail[];
    } = {},
): HttpException {
    return new HttpException(buildApiErrorEnvelope(statusCode, code, options), statusCode);
}

export function createValidationHttpException(
    details: ApiErrorDetail[],
    message = 'Validation failed',
): HttpException {
    return createApiHttpException(HttpStatus.BAD_REQUEST, ApiErrorCode.VALIDATION_FAILED, { message, details });
}

export function createInvalidRequestHttpException(
    message: string,
    details?: ApiErrorDetail[],
): HttpException {
    return createApiHttpException(HttpStatus.BAD_REQUEST, ApiErrorCode.INVALID_REQUEST, { message, details });
}

export function createNotFoundHttpException(message = 'Resource not found.'): HttpException {
    return createApiHttpException(HttpStatus.NOT_FOUND, ApiErrorCode.NOT_FOUND, { message });
}

export function createForbiddenHttpException(message = 'Forbidden.'): HttpException {
    return createApiHttpException(HttpStatus.FORBIDDEN, ApiErrorCode.FORBIDDEN, { message });
}

export function createUniqueConstraintHttpException(
    message = 'Unique constraint violated.',
    details?: ApiErrorDetail[],
): HttpException {
    const normalizedDetails = details && details.length > 0 ? details : parseUniqueConstraintDetails(message);
    return createApiHttpException(HttpStatus.CONFLICT, ApiErrorCode.UNIQUE_CONSTRAINT, {
        message,
        details: normalizedDetails,
    });
}

export function createInternalErrorHttpException(): HttpException {
    return createApiHttpException(HttpStatus.INTERNAL_SERVER_ERROR, ApiErrorCode.INTERNAL_ERROR);
}

export function createPersistenceHttpException(error: unknown): HttpException {
    const errorRecord = asRecord(error);
    const message = typeof errorRecord?.detail === 'string'
        ? errorRecord.detail
        : typeof errorRecord?.message === 'string'
            ? errorRecord.message
            : 'Persistence operation failed.';
    const dbCode = typeof errorRecord?.code === 'string' ? errorRecord.code : undefined;

    if (dbCode === '23505' || parseUniqueConstraintDetails(message).length > 0) {
        return createUniqueConstraintHttpException(message);
    }

    if (isIntegrityConstraintViolation(dbCode) || typeof errorRecord?.constraint === 'string') {
        return createInvalidRequestHttpException(message);
    }

    return createInternalErrorHttpException();
}

export function createEntityLockedHttpException(message = 'Entity is currently locked.'): HttpException {
    return createApiHttpException(HttpStatus.CONFLICT, ApiErrorCode.ENTITY_LOCKED, { message });
}

export function createWorkflowRunningHttpException(
    message = 'A workflow execution is already running for this service.',
): HttpException {
    return createApiHttpException(HttpStatus.CONFLICT, ApiErrorCode.WORKFLOW_RUNNING, { message });
}

export function createValidationErrorDetails(errors: ValidationError[]): ApiErrorDetail[] {
    const details: ApiErrorDetail[] = [];
    const queue = errors.map((error) => ({ error, prefix: '' }));

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) continue;

        const { error, prefix } = current;
        const path = [prefix, error.property].filter(Boolean).join('.');
        const constraints = error.constraints ?? {};
        for (const [code, message] of Object.entries(constraints)) {
            details.push({
                path: path || undefined,
                code,
                message,
            });
        }

        for (const child of error.children ?? []) {
            queue.push({ error: child, prefix: path });
        }
    }

    return details;
}

export function normalizeHttpExceptionPayload(statusCode: number, response: unknown): ApiErrorEnvelope {
    const responseRecord = asRecord(response);
    const providedDetails = normalizeDetails(responseRecord?.details);
    const messageFromResponse = getMessageFromResponse(response);
    const fallback = inferLegacyCode(statusCode, messageFromResponse, providedDetails);
    const code = getApiErrorCode(responseRecord?.code) ?? fallback.code;
    const details = providedDetails.length > 0 ? providedDetails : fallback.details;

    return buildApiErrorEnvelope(statusCode, code, {
        message: messageFromResponse ?? fallback.message,
        details,
    });
}

function getMessageFromResponse(response: unknown): string | undefined {
    if (typeof response === 'string') {
        return response;
    }

    const responseRecord = asRecord(response);
    if (!responseRecord) return undefined;

    if (typeof responseRecord.message === 'string') {
        return responseRecord.message;
    }

    if (Array.isArray(responseRecord.message)) {
        return responseRecord.message.filter((value): value is string => typeof value === 'string').join('; ');
    }

    if (typeof responseRecord.error === 'string') {
        return responseRecord.error;
    }

    return undefined;
}

function normalizeDetails(value: unknown): ApiErrorDetail[] {
    if (!Array.isArray(value)) return [];

    return value
        .map((detail) => {
            const detailRecord = asRecord(detail);
            if (!detailRecord || typeof detailRecord.message !== 'string') return null;
            return {
                path: typeof detailRecord.path === 'string' && detailRecord.path.trim().length > 0
                    ? detailRecord.path
                    : undefined,
                code: typeof detailRecord.code === 'string' && detailRecord.code.trim().length > 0
                    ? detailRecord.code
                    : 'unknown',
                message: detailRecord.message,
                ...(isContext(detailRecord.context) ? { context: detailRecord.context } : {}),
            } satisfies ApiErrorDetail;
        })
        .filter((detail) => !!detail) as ApiErrorDetail[];
}

function inferLegacyCode(
    statusCode: number,
    message: string | undefined,
    details: ApiErrorDetail[],
): {
    code: ApiErrorCode;
    message?: string;
    details?: ApiErrorDetail[];
} {
    if (statusCode === HttpStatus.BAD_REQUEST && details.length > 0) {
        return { code: ApiErrorCode.VALIDATION_FAILED };
    }

    const normalizedMessage = `${message ?? ''}`.toLowerCase();
    if (normalizedMessage.includes('already running')) {
        return { code: ApiErrorCode.WORKFLOW_RUNNING };
    }
    if (normalizedMessage.includes('currently locked')) {
        return { code: ApiErrorCode.ENTITY_LOCKED };
    }

    const uniqueDetails = parseUniqueConstraintDetails(message);
    if (uniqueDetails.length > 0) {
        return {
            code: ApiErrorCode.UNIQUE_CONSTRAINT,
            details: uniqueDetails,
        };
    }

    return { code: defaultCodeForStatus(statusCode) };
}

function parseUniqueConstraintDetails(message?: string): ApiErrorDetail[] {
    if (!message) return [];

    const match = message.match(/Key \(([^)]+)\)=\(([^)]+)\) already exists\./i);
    if (!match) return [];

    const keys = match[1].split(',').map((value) => value.trim()).filter(Boolean);
    const values = match[2].split(',').map((value) => value.trim());
    return keys.map((key, index) => ({
        path: key,
        code: 'unique',
        message: 'Value already exists.',
        context: values[index] ? { value: values[index] } : undefined,
    }));
}

function sanitizeMessage(statusCode: number, code: ApiErrorCode, message?: string): string {
    if (code === ApiErrorCode.UNIQUE_CONSTRAINT || code === ApiErrorCode.ENTITY_LOCKED || code === ApiErrorCode.WORKFLOW_RUNNING) {
        return DEFAULT_MESSAGES[code];
    }
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
        return DEFAULT_MESSAGES[ApiErrorCode.INTERNAL_ERROR];
    }
    if (!message || !message.trim()) {
        return DEFAULT_MESSAGES[code];
    }
    return message;
}

function defaultCodeForStatus(statusCode: number): ApiErrorCode {
    switch (statusCode) {
        case HttpStatus.BAD_REQUEST:
            return ApiErrorCode.INVALID_REQUEST;
        case HttpStatus.UNAUTHORIZED:
            return ApiErrorCode.UNAUTHENTICATED;
        case HttpStatus.FORBIDDEN:
            return ApiErrorCode.FORBIDDEN;
        case HttpStatus.NOT_FOUND:
            return ApiErrorCode.NOT_FOUND;
        case HttpStatus.CONFLICT:
            return ApiErrorCode.INVALID_REQUEST;
        default:
            return statusCode >= HttpStatus.INTERNAL_SERVER_ERROR
                ? ApiErrorCode.INTERNAL_ERROR
                : ApiErrorCode.INVALID_REQUEST;
    }
}

function getApiErrorCode(value: unknown): ApiErrorCode | null {
    if (typeof value !== 'string') return null;
    return Object.values(ApiErrorCode).includes(value as ApiErrorCode) ? value as ApiErrorCode : null;
}

function isIntegrityConstraintViolation(dbCode: string | undefined): boolean {
    return typeof dbCode === 'string' && dbCode.startsWith('23');
}

function asRecord(value: unknown): MutableRecord | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as MutableRecord;
}

function isContext(value: unknown): value is Record<string, string | number | boolean> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return Object.values(value).every((entry) => ['string', 'number', 'boolean'].includes(typeof entry));
}
