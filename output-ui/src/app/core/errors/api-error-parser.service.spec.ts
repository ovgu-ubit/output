import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ApiErrorCode } from '../../../../../output-interfaces/ApiError';
import { ApiErrorParser } from './api-error-parser.service';

describe('ApiErrorParser', () => {
  const service = new ApiErrorParser();

  it('parses the shared API error envelope', () => {
    const parsed = service.parse(new HttpErrorResponse({
      status: 409,
      headers: new HttpHeaders({ 'x-correlation-id': 'corr-123' }),
      error: {
        statusCode: 409,
        code: ApiErrorCode.ENTITY_LOCKED,
        message: 'Entity is currently locked.',
        details: [{ path: 'label', code: 'locked', message: 'Locked' }],
        correlationId: 'corr-123',
        timestamp: '2026-04-07T10:00:00.000Z',
        path: '/api/workflow',
      },
    }));

    expect(parsed).toEqual(jasmine.objectContaining({
      status: 409,
      code: ApiErrorCode.ENTITY_LOCKED,
      correlationId: 'corr-123',
      details: [jasmine.objectContaining({ path: 'label' })],
    }));
  });

  it('parses legacy validation responses with details', () => {
    const parsed = service.parse(new HttpErrorResponse({
      status: 400,
      error: {
        message: 'Validation failed',
        details: [{ path: 'mapping', code: 'too_small', message: 'Required' }],
      },
    }));

    expect(parsed.code).toBe(ApiErrorCode.VALIDATION_FAILED);
    expect(parsed.details[0]).toEqual(jasmine.objectContaining({ path: 'mapping' }));
  });

  it('maps status 0 to a network error', () => {
    const parsed = service.parse(new HttpErrorResponse({
      status: 0,
      error: new ProgressEvent('error'),
    }));

    expect(parsed.code).toBe('NETWORK_ERROR');
    expect(parsed.message).toBe('Backend nicht erreichbar.');
  });

  it('maps legacy unique messages to UNIQUE_CONSTRAINT', () => {
    const parsed = service.parse(new HttpErrorResponse({
      status: 400,
      error: {
        message: 'Key (label)=(Test) already exists.',
      },
    }));

    expect(parsed.code).toBe(ApiErrorCode.UNIQUE_CONSTRAINT);
  });

  it('falls back to INTERNAL_ERROR for unknown server errors', () => {
    const parsed = service.parse(new HttpErrorResponse({
      status: 500,
      error: {
        message: 'Unexpected failure',
      },
    }));

    expect(parsed.code).toBe(ApiErrorCode.INTERNAL_ERROR);
  });
});
