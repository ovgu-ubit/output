import { ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AppConfigService } from '../config/app-config.service';
import { AbstractEntityService, LockableEntity } from './abstract-entity.service';

interface TestEntity extends LockableEntity {
    label?: string;
}

class TestEntityService extends AbstractEntityService<TestEntity> {
    constructor(
        repository: Repository<TestEntity>,
        configService: AppConfigService,
    ) {
        super(repository, configService);
    }
}

describe('AbstractEntityService', () => {
    let service: TestEntityService;
    let repository: {
        findOne: jest.Mock;
        save: jest.Mock;
        update: jest.Mock;
        metadata: { tableName: string };
    };
    let configService: { get: jest.Mock };

    beforeEach(() => {
        repository = {
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            metadata: { tableName: 'test_entity' },
        };
        configService = {
            get: jest.fn(async () => 5),
        };

        service = new TestEntityService(
            repository as unknown as Repository<TestEntity>,
            configService as unknown as AppConfigService,
        );
    });

    it('acquires a lock and keeps the entity editable for the locking user', async () => {
        repository.findOne.mockResolvedValue({
            id: 1,
            label: 'Entity',
            locked_at: null,
        } as TestEntity);
        repository.update.mockResolvedValue({ affected: 1 } as any);

        const result = await service.one(1, true, 'alice');

        expect(repository.update).toHaveBeenCalledWith(
            expect.objectContaining({ id: 1, locked_at: expect.any(Object) }),
            expect.objectContaining({ locked_at: expect.any(Date) }),
        );
        expect(result).toMatchObject({ id: 1, label: 'Entity' });
        expect(result?.locked_at).toBeUndefined();
    });

    it('returns a locked entity for another user while the lock is still active', async () => {
        const lockedAt = new Date();

        repository.findOne
            .mockResolvedValueOnce({
                id: 1,
                label: 'Entity',
                locked_at: null,
            } as TestEntity)
            .mockResolvedValueOnce({
                id: 1,
                label: 'Entity',
                locked_at: lockedAt,
            } as TestEntity);
        repository.update.mockResolvedValue({ affected: 1 } as any);

        await service.one(1, true, 'alice');
        const result = await service.one(1, true, 'mallory');

        expect(result?.locked_at).toBe(lockedAt);
    });

    it('allows the lock owner to release an active lock via update', async () => {
        const lockedAt = new Date();

        repository.findOne
            .mockResolvedValueOnce({
                id: 1,
                label: 'Entity',
                locked_at: null,
            } as TestEntity)
            .mockResolvedValueOnce({
                id: 1,
                label: 'Entity',
                locked_at: lockedAt,
            } as TestEntity);
        repository.update.mockResolvedValue({ affected: 1 } as any);
        repository.save.mockResolvedValue({
            id: 1,
            locked_at: null,
        } as TestEntity);

        await service.one(1, true, 'alice');
        await expect(service.update({ id: 1, locked_at: null }, 'alice')).resolves.toMatchObject({
            id: 1,
            locked_at: null,
        });
    });

    it('rejects unlock-only updates from another user while the lock is active', async () => {
        repository.findOne
            .mockResolvedValueOnce({
                id: 1,
                label: 'Entity',
                locked_at: null,
            } as TestEntity)
            .mockResolvedValueOnce({
                id: 1,
                label: 'Entity',
                locked_at: new Date(),
            } as TestEntity);
        repository.update.mockResolvedValue({ affected: 1 } as any);

        await service.one(1, true, 'alice');

        await expect(service.update({ id: 1, locked_at: null }, 'mallory')).rejects.toBeInstanceOf(ConflictException);
        expect(repository.save).not.toHaveBeenCalled();
    });
});
