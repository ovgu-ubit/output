export enum ApiErrorCode {
    VALIDATION_FAILED = 'VALIDATION_FAILED',
    INVALID_REQUEST = 'INVALID_REQUEST',
    ENTITY_LOCKED = 'ENTITY_LOCKED',
    UNIQUE_CONSTRAINT = 'UNIQUE_CONSTRAINT',
    NOT_FOUND = 'NOT_FOUND',
    FORBIDDEN = 'FORBIDDEN',
    UNAUTHENTICATED = 'UNAUTHENTICATED',
    WORKFLOW_RUNNING = 'WORKFLOW_RUNNING',
    INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface ApiErrorDetail {
    path?: string;
    code: string;
    message: string;
    context?: Record<string, string | number | boolean>;
}

export interface ApiErrorResponse {
    statusCode: number;
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetail[];
    correlationId: string;
    timestamp: string;
    path: string;
}
