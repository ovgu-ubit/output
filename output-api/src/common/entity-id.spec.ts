import { HttpException } from '@nestjs/common';
import { ApiErrorCode } from '../../../output-interfaces/ApiError';
import { assertCreateRequestHasNoId, hasProvidedEntityId } from './entity-id';

describe('entity-id', () => {
    it.each([0, 4, '0'])('treats %p as a provided entity id', (id) => {
        expect(hasProvidedEntityId(id)).toBe(true);
    });

    it.each([undefined, null, ''])('treats %p as an omitted entity id', (id) => {
        expect(hasProvidedEntityId(id)).toBe(false);
    });

    it('rejects create requests when id is 0', () => {
        try {
            assertCreateRequestHasNoId({ id: 0 });
            fail('assertCreateRequestHasNoId should throw for create requests with id');
        } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getResponse()).toMatchObject({
                statusCode: 400,
                code: ApiErrorCode.INVALID_REQUEST,
                details: expect.arrayContaining([
                    expect.objectContaining({ path: 'id', code: 'forbidden_id' }),
                ]),
            });
        }
    });
});
