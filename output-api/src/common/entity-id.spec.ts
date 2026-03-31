import { BadRequestException } from '@nestjs/common';
import { assertCreateRequestHasNoId, hasProvidedEntityId } from './entity-id';

describe('entity-id', () => {
    it.each([0, 4, '0'])('treats %p as a provided entity id', (id) => {
        expect(hasProvidedEntityId(id)).toBe(true);
    });

    it.each([undefined, null, ''])('treats %p as an omitted entity id', (id) => {
        expect(hasProvidedEntityId(id)).toBe(false);
    });

    it('rejects create requests when id is 0', () => {
        expect(() => assertCreateRequestHasNoId({ id: 0 })).toThrow(BadRequestException);
    });
});
