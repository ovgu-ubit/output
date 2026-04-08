import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { ApiErrorResponse, ApiErrorCode } from '../../../output-interfaces/ApiError';
import { buildApiErrorEnvelope, CORRELATION_ID_HEADER, normalizeHttpExceptionPayload } from './api-error';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(ApiExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const context = host.switchToHttp();
        const response = context.getResponse<Response>();
        const request = context.getRequest<Request>();
        const status = exception instanceof HttpException
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;
        const correlationId = this.resolveCorrelationId(request, response);
        const payload = this.createPayload(exception, status, correlationId, request);

        this.logException(exception, status, correlationId, request, payload);

        response
            .status(status)
            .json(payload);
    }

    private createPayload(
        exception: unknown,
        status: number,
        correlationId: string,
        request: Request,
    ): ApiErrorResponse {
        const envelope = exception instanceof HttpException
            ? normalizeHttpExceptionPayload(status, exception.getResponse())
            : buildApiErrorEnvelope(HttpStatus.INTERNAL_SERVER_ERROR, ApiErrorCode.INTERNAL_ERROR);

        return {
            ...envelope,
            correlationId,
            timestamp: new Date().toISOString(),
            path: request.originalUrl ?? request.url,
        };
    }

    private resolveCorrelationId(request: Request, response: Response): string {
        const headerValue = request.headers[CORRELATION_ID_HEADER] ?? request.headers['x-request-id'];
        const correlationId = Array.isArray(headerValue)
            ? headerValue[0]
            : headerValue;
        const resolved = typeof correlationId === 'string' && correlationId.trim().length > 0
            ? correlationId
            : randomUUID();

        response.setHeader(CORRELATION_ID_HEADER, resolved);
        return resolved;
    }

    private logException(
        exception: unknown,
        status: number,
        correlationId: string,
        request: Request,
        payload: ApiErrorResponse,
    ): void {
        const prefix = `[${correlationId}] ${request.method} ${request.originalUrl ?? request.url}`;
        if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
            const stack = exception instanceof Error ? exception.stack : undefined;
            this.logger.error(`${prefix} -> ${payload.code}`, stack);
            return;
        }

        if (status >= HttpStatus.BAD_REQUEST) {
            const details = payload.details?.map((detail) => `${detail.path ?? '-'}:${detail.code}`).join(', ');
            this.logger.warn(`${prefix} -> ${payload.code}${details ? ` (${details})` : ''}`);
        }
    }
}
