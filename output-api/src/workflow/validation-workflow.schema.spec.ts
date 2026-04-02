import { BadRequestException } from '@nestjs/common';
import { CompareOperation, JoinOperation } from '../../../output-interfaces/Config';
import { validateValidationWorkflow } from './validation-workflow.schema';

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
                { type: 'compare', result: 'warning', path: 'status', value: 1 },
                { type: 'conditional', result: 'info' },
            ],
        });
    });

    it('rejects unknown validation targets', () => {
        expect(() => validateValidationWorkflow({
            workflow_id: 'validation-2',
            label: 'Validation',
            target: 'greater_entity',
            rules: [],
        } as any)).toThrow(BadRequestException);
    });

    it('rejects invalid target filters', () => {
        expect(() => validateValidationWorkflow({
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
        } as any)).toThrow(BadRequestException);
    });

    it('rejects malformed validation rules', () => {
        expect(() => validateValidationWorkflow({
            workflow_id: 'validation-4',
            label: 'Validation',
            target: 'publication',
            rules: [{
                type: 'compare',
                result: 'warning',
                path: 'status',
            }],
        } as any)).toThrow(BadRequestException);
    });
});
