import { HttpException } from '@nestjs/common';
import { ApiErrorCode } from '../../../output-interfaces/ApiError';
import { CompareOperation, JoinOperation } from '../../../output-interfaces/Config';
import { validateValidationWorkflow } from './validation-workflow.schema';

const expectValidationFailure = (action: () => unknown) => {
    try {
        action();
        fail('Expected validation workflow parser to throw');
    } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getResponse()).toMatchObject({
            statusCode: 400,
            code: ApiErrorCode.VALIDATION_FAILED,
            message: 'Validation failed',
        });
    }
};

describe('validateValidationWorkflow', () => {
    it('accepts a validation workflow with required, compare and conditional rules', () => {
        expect(validateValidationWorkflow({
            workflow_id: 'validation-1',
            label: 'Validation',
            target: 'publication',
            target_filter: {
                expressions: [{
                    op: JoinOperation.AND,
                    key: 'reporting_year',
                    comp: CompareOperation.EQUALS,
                    value: 2025,
                }]
            },
            rules: [
                {
                    type: 'required',
                    result: 'error',
                    path: 'doi',
                },
                {
                    type: 'compare',
                    result: 'warning',
                    path: 'status',
                    comp: CompareOperation.EQUALS,
                    value: 1,
                    negate: true,
                },
                {
                    type: 'conditional',
                    result: 'info',
                    if: {
                        type: 'compare',
                        path: 'oa_category',
                        comp: CompareOperation.EQUALS,
                        value: 'gold',
                    },
                    then: {
                        type: 'required',
                        path: 'license',
                    }
                }
            ],
        } as any)).toMatchObject({
            workflow_id: 'validation-1',
            label: 'Validation',
            target: 'publication',
            target_filter: {
                expressions: [{
                    key: 'reporting_year',
                    value: 2025,
                }]
            },
            rules: [
                { type: 'required', result: 'error', path: 'doi' },
                { type: 'compare', result: 'warning', path: 'status', value: 1, negate: true },
                { type: 'conditional', result: 'info' },
            ],
        });
    });

    it('rejects unknown validation targets', () => {
        expectValidationFailure(() => validateValidationWorkflow({
            workflow_id: 'validation-2',
            label: 'Validation',
            target: 'greater_entity',
            rules: [],
        } as any));
    });

    it('rejects invalid target filters', () => {
        expectValidationFailure(() => validateValidationWorkflow({
            workflow_id: 'validation-3',
            label: 'Validation',
            target: 'publication',
            target_filter: {
                expressions: [{
                    key: 'status',
                    value: 1,
                }]
            },
            rules: [],
        } as any));
    });

    it('rejects malformed validation rules', () => {
        expectValidationFailure(() => validateValidationWorkflow({
            workflow_id: 'validation-4',
            label: 'Validation',
            target: 'publication',
            rules: [{
                type: 'compare',
                result: 'warning',
                path: 'status',
            }],
        } as any));
    });
});
