import { BadRequestException, ConflictException } from '@nestjs/common';
import { ApiErrorCode } from '../../../output-interfaces/ApiError';
import { ApiExceptionFilter } from './api-exception.filter';
import { createValidationHttpException } from './api-error';

describe('ApiExceptionFilter', () => {
    const filter = new ApiExceptionFilter();

    function createHost(path = '/api/test') {
        const response = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            setHeader: jest.fn(),
        };
        const request = {
            headers: {},
            method: 'GET',
            originalUrl: path,
            url: path,
        };

        return {
            response,
            request,
            host: {
                switchToHttp: () => ({
                    getResponse: () => response,
                    getRequest: () => request,
                }),
            } as any,
        };
    }

    it('normalizes plain bad requests into the shared envelope', () => {
        const { response, host } = createHost();

        filter.catch(new BadRequestException('id must be given'), host);

        expect(response.status).toHaveBeenCalledWith(400);
        expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
            statusCode: 400,
            code: ApiErrorCode.INVALID_REQUEST,
            message: 'id must be given',
            path: '/api/test',
        }));
    });

    it('preserves structured validation errors', () => {
        const { response, host } = createHost('/api/workflow');

        filter.catch(createValidationHttpException([
            { path: 'strategy.mapping', code: 'too_small', message: 'Required' },
        ]), host);

        expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
            statusCode: 400,
            code: ApiErrorCode.VALIDATION_FAILED,
            details: expect.arrayContaining([
                expect.objectContaining({ path: 'strategy.mapping', code: 'too_small' }),
            ]),
        }));
    });

    it('maps legacy unique constraint messages to UNIQUE_CONSTRAINT', () => {
        const { response, host } = createHost();

        filter.catch(new BadRequestException('Key (label)=(Test) already exists.'), host);

        expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
            statusCode: 400,
            code: ApiErrorCode.UNIQUE_CONSTRAINT,
            message: 'Unique constraint violated.',
            details: expect.arrayContaining([
                expect.objectContaining({ path: 'label', code: 'unique' }),
            ]),
        }));
    });

    it('maps legacy lock conflicts to ENTITY_LOCKED', () => {
        const { response, host } = createHost();

        filter.catch(new ConflictException('Entity is currently locked.'), host);

        expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
            statusCode: 409,
            code: ApiErrorCode.ENTITY_LOCKED,
            message: 'Entity is currently locked.',
        }));
    });

    it('hides internal error details behind INTERNAL_ERROR', () => {
        const { response, host } = createHost();

        filter.catch(new Error('database unavailable'), host);

        expect(response.status).toHaveBeenCalledWith(500);
        expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
            statusCode: 500,
            code: ApiErrorCode.INTERNAL_ERROR,
            message: 'Internal server error.',
        }));
    });
});
