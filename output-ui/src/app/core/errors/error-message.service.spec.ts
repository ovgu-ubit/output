import { ApiErrorCode } from '../../../../../output-interfaces/ApiError';
import { ErrorMessageService } from './error-message.service';

describe('ErrorMessageService', () => {
  const service = new ErrorMessageService();

  it('creates a contextual lock message', () => {
    expect(service.getMessage({
      status: 409,
      code: ApiErrorCode.ENTITY_LOCKED,
      message: 'Entity is currently locked.',
      details: [],
    }, { entity: 'Workflow' })).toContain('Workflow');
  });

  it('creates a contextual validation message for save actions', () => {
    expect(service.getMessage({
      status: 400,
      code: ApiErrorCode.VALIDATION_FAILED,
      message: 'Validation failed',
      details: [],
    }, { action: 'save', entity: 'Workflow' })).toContain('gespeichert');
  });

  it('includes the correlation id for internal errors', () => {
    expect(service.getMessage({
      status: 500,
      code: ApiErrorCode.INTERNAL_ERROR,
      message: 'Internal server error.',
      details: [],
      correlationId: 'corr-42',
    })).toContain('corr-42');
  });
});
