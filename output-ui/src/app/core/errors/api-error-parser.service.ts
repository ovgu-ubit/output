import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApiErrorCode, ApiErrorDetail, ApiErrorResponse } from '../../../../../output-interfaces/ApiError';
import { UiError, UiErrorCarrier, UiErrorCode } from './ui-error';

@Injectable({
  providedIn: 'root'
})
export class ApiErrorParser {
  parse(error: unknown): UiError {
    const carried = this.extractCarriedError(error);
    if (carried) return carried;

    if (error instanceof HttpErrorResponse) {
      return this.parseHttpErrorResponse(error);
    }

    if (this.isUiError(error)) {
      return error;
    }

    return {
      status: 500,
      code: 'UNKNOWN_ERROR',
      message: 'Unerwarteter Fehler.',
      details: [],
      raw: error,
    };
  }

  private parseHttpErrorResponse(error: HttpErrorResponse): UiError {
    if (error.status === 0) {
      return {
        status: 0,
        code: 'NETWORK_ERROR',
        message: 'Backend nicht erreichbar.',
        details: [],
        raw: error,
      };
    }

    const payload = this.parseApiErrorResponse(error.error);
    if (payload) {
      return {
        status: error.status || payload.statusCode,
        code: payload.code,
        message: payload.message,
        details: payload.details ?? [],
        correlationId: payload.correlationId || error.headers.get('x-correlation-id') || undefined,
        path: payload.path,
        raw: error,
      };
    }

    return this.parseLegacyHttpError(error);
  }

  private parseApiErrorResponse(value: unknown): ApiErrorResponse | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

    const body = value as Partial<ApiErrorResponse>;
    if (!this.isApiErrorCode(body.code)) return null;
    if (typeof body.statusCode !== 'number') return null;
    if (typeof body.message !== 'string') return null;

    return {
      statusCode: body.statusCode,
      code: body.code,
      message: body.message,
      details: this.normalizeDetails(body.details),
      correlationId: typeof body.correlationId === 'string' ? body.correlationId : '',
      timestamp: typeof body.timestamp === 'string' ? body.timestamp : '',
      path: typeof body.path === 'string' ? body.path : '',
    };
  }

  private parseLegacyHttpError(error: HttpErrorResponse): UiError {
    const body = error.error;
    const details = this.normalizeDetails(this.asRecord(body)?.details);
    const message = this.extractMessage(body) ?? error.message ?? 'Unerwarteter Fehler.';
    const code = this.resolveCode(error.status, message, details);

    return {
      status: error.status,
      code,
      message,
      details,
      correlationId: error.headers.get('x-correlation-id') || undefined,
      raw: error,
    };
  }

  private resolveCode(status: number, message: string, details: ApiErrorDetail[]): UiErrorCode {
    const normalizedMessage = message.toLowerCase();
    if (details.length > 0 && status === 400) return ApiErrorCode.VALIDATION_FAILED;
    if (normalizedMessage.includes('already exists')) return ApiErrorCode.UNIQUE_CONSTRAINT;
    if (normalizedMessage.includes('currently locked')) return ApiErrorCode.ENTITY_LOCKED;
    if (normalizedMessage.includes('already running')) return ApiErrorCode.WORKFLOW_RUNNING;

    switch (status) {
      case 400:
        return ApiErrorCode.INVALID_REQUEST;
      case 401:
        return ApiErrorCode.UNAUTHENTICATED;
      case 403:
        return ApiErrorCode.FORBIDDEN;
      case 404:
        return ApiErrorCode.NOT_FOUND;
      case 409:
        return ApiErrorCode.INVALID_REQUEST;
      default:
        return status >= 500 ? ApiErrorCode.INTERNAL_ERROR : 'UNKNOWN_ERROR';
    }
  }

  private extractMessage(value: unknown): string | undefined {
    if (typeof value === 'string') return value;

    const record = this.asRecord(value);
    if (!record) return undefined;

    if (typeof record.message === 'string') return record.message;
    if (Array.isArray(record.message)) {
      return record.message.filter((entry): entry is string => typeof entry === 'string').join('; ');
    }
    if (typeof record.error === 'string') return record.error;

    return undefined;
  }

  private normalizeDetails(value: unknown): ApiErrorDetail[] {
    if (!Array.isArray(value)) return [];

    return value
      .map((detail) => {
        const record = this.asRecord(detail);
        if (!record || typeof record.message !== 'string') return null;
        return {
          path: typeof record.path === 'string' ? record.path : undefined,
          code: typeof record.code === 'string' && record.code.length > 0 ? record.code : 'unknown',
          message: record.message,
          context: this.isContext(record.context) ? record.context : undefined,
        } satisfies ApiErrorDetail;
      })
      .filter((detail) => !!detail) as ApiErrorDetail[];
  }

  private extractCarriedError(error: unknown): UiError | null {
    if (!error || typeof error !== 'object') return null;
    const carried = (error as UiErrorCarrier).uiError;
    return this.isUiError(carried) ? carried : null;
  }

  private isUiError(value: unknown): value is UiError {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const candidate = value as Partial<UiError>;
    return typeof candidate.status === 'number'
      && typeof candidate.code === 'string'
      && typeof candidate.message === 'string'
      && Array.isArray(candidate.details);
  }

  private isApiErrorCode(value: unknown): value is ApiErrorCode {
    return typeof value === 'string' && Object.values(ApiErrorCode).includes(value as ApiErrorCode);
  }

  private isContext(value: unknown): value is Record<string, string | number | boolean> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return Object.values(value).every((entry) => ['string', 'number', 'boolean'].includes(typeof entry));
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  }
}
