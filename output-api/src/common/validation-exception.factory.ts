import { ValidationError } from '@nestjs/common';
import { createValidationErrorDetails, createValidationHttpException } from './api-error';

export function createValidationException(errors: ValidationError[]) {
    return createValidationHttpException(createValidationErrorDetails(errors));
}
