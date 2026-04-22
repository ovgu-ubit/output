import { HttpException } from '@nestjs/common';
import { ApiErrorCode } from '../../../output-interfaces/ApiError';
import { AbstractCrudController } from './abstract-crud.controller';
import { LockableEntity } from './abstract-entity.service';

interface TestEntity extends LockableEntity {
    label?: string;
}

class TestCrudController extends AbstractCrudController<TestEntity, any> {
    constructor(service: any) {
        super(service);
    }
}

describe('AbstractCrudController', () => {
    let controller: TestCrudController;
    let service: { one: jest.Mock; update: jest.Mock; get: jest.Mock; save: jest.Mock; delete: jest.Mock; normalizeForCreate: jest.Mock };

    beforeEach(() => {
        service = {
            one: jest.fn(),
            update: jest.fn(),
            get: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            normalizeForCreate: jest.fn((body) => body),
        };

        controller = new TestCrudController(service);
    });

    it('forwards writer flag and username when loading one entity', async () => {
        service.one.mockResolvedValue({ id: 7 });

        await controller.one(7, { user: { write: true, username: 'alice' } } as any);

        expect(service.one).toHaveBeenCalledWith(7, true, 'alice');
    });

    it('forwards username when updating an entity', async () => {
        const entity = { id: 9, label: 'Updated' };
        service.update.mockResolvedValue(entity);

        await controller.update(entity, { user: { username: 'alice' } } as any);

        expect(service.update).toHaveBeenCalledWith(entity, 'alice');
    });

    it.each([4, 0])('rejects create requests that already provide an id (%s)', async (id) => {
        try {
            await controller.save({ id, label: 'Existing' });
            fail('controller.save should reject create requests with id');
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
        expect(service.save).not.toHaveBeenCalled();
    });

    it('returns a structured not found error when the entity does not exist', async () => {
        service.one.mockResolvedValue(null);

        try {
            await controller.one(42, { user: { write: true, username: 'alice' } } as any);
            fail('controller.one should throw when entity is missing');
        } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getResponse()).toMatchObject({
                statusCode: 404,
                code: ApiErrorCode.NOT_FOUND,
            });
        }
    });
});
