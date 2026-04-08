import { ApiErrorCode } from '../../../output-interfaces/ApiError';
import { createValidationException } from './validation-exception.factory';

describe('createValidationException', () => {
    it('creates a shared validation payload for nested validation errors', () => {
        const exception = createValidationException([
            {
                property: 'strategy',
                children: [
                    {
                        property: 'url_lookup',
                        constraints: {
                            isNotEmpty: 'url_lookup should not be empty',
                        },
                        children: [],
                    },
                ],
            },
        ] as any);

        expect(exception.getStatus()).toBe(400);
        expect(exception.getResponse()).toMatchObject({
            statusCode: 400,
            code: ApiErrorCode.VALIDATION_FAILED,
            message: 'Validation failed',
            details: expect.arrayContaining([
                expect.objectContaining({
                    path: 'strategy.url_lookup',
                    code: 'isNotEmpty',
                    message: 'url_lookup should not be empty',
                }),
            ]),
        });
    });
});
