import { BadRequestException } from '@nestjs/common';
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
        await expect(controller.save({ id, label: 'Existing' })).rejects.toBeInstanceOf(BadRequestException);
        expect(service.save).not.toHaveBeenCalled();
    });
});
