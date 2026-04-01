import { BadRequestException } from '@nestjs/common';
import { validateValidationWorkflow } from './validation-workflow.schema';

describe('validateValidationWorkflow', () => {
    it('accepts a minimal validation workflow payload', () => {
        expect(validateValidationWorkflow({
            workflow_id: 'validation-1',
            label: 'Validation',
            target: 'publication',
            rules: [],
        } as any)).toMatchObject({
            workflow_id: 'validation-1',
            label: 'Validation',
            target: 'publication',
            rules: [],
        });
    });

    it('rejects non-array rules payloads', () => {
        expect(() => validateValidationWorkflow({
            workflow_id: 'validation-2',
            label: 'Validation',
            rules: {} as any,
        } as any)).toThrow(BadRequestException);
    });
});
