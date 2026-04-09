import { HttpException } from '@nestjs/common';
import { ApiErrorCode } from '../../../output-interfaces/ApiError';
import { Repository } from 'typeorm';
import { AppConfigService } from '../config/app-config.service';
import { AbstractEntityService, LockableEntity } from './abstract-entity.service';
import { EditLockOwnerStore } from './edit-lock';

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
        EditLockOwnerStore.clear();
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

        await expect(service.update({ id: 1, locked_at: null }, 'mallory')).rejects.toEqual(expect.objectContaining({
            getResponse: expect.any(Function),
        }));
        expect(repository.save).not.toHaveBeenCalled();
    });

    it('keeps the same user as lock owner across regular updates without locked_at in the payload', async () => {
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
            } as TestEntity)
            .mockResolvedValueOnce({
                id: 1,
                label: 'Entity',
                locked_at: lockedAt,
            } as TestEntity);
        repository.update.mockResolvedValue({ affected: 1 } as any);
        repository.save.mockImplementation(async (entity) => entity);

        await service.one(1, true, 'alice');
        await expect(service.update({ id: 1, label: 'Updated' }, 'alice')).resolves.toMatchObject({
            id: 1,
            label: 'Updated',
        });
        await expect(service.update({ id: 1, label: 'Updated again' }, 'alice')).resolves.toMatchObject({
            id: 1,
            label: 'Updated again',
        });
    });

    it('keeps numeric id 0 intact while normalizing omitted ids for create requests', () => {
        expect(service.normalizeForCreate({ id: 0, label: 'Existing' })).toMatchObject({ id: 0 });
        expect(service.normalizeForCreate({ id: '' as any, label: 'Draft' })).toMatchObject({ id: undefined });
        expect(service.normalizeForCreate({ id: null as any, label: 'Draft' })).toMatchObject({ id: undefined });
    });

    it('wraps unique constraint violations in the shared API error format', async () => {
        repository.save.mockRejectedValue({
            code: '23505',
            detail: 'Key (label)=(Existing) already exists.',
            constraint: 'uq_test_entity_label',
        });

        try {
            await service.save({ label: 'Existing' });
            fail('service.save should throw for duplicate values');
        } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getResponse()).toMatchObject({
                statusCode: 409,
                code: ApiErrorCode.UNIQUE_CONSTRAINT,
                details: expect.arrayContaining([
                    expect.objectContaining({ path: 'label', code: 'unique' }),
                ]),
            });
        }
    });

    it('maps non-unique integrity violations to INVALID_REQUEST instead of INTERNAL_ERROR', async () => {
        repository.save.mockRejectedValue({
            code: '23502',
            message: 'null value in column "label" of relation "test_entity" violates not-null constraint',
        });

        try {
            await service.save({ label: undefined });
            fail('service.save should throw for integrity violations');
        } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getResponse()).toMatchObject({
                statusCode: 400,
                code: ApiErrorCode.INVALID_REQUEST,
                message: 'null value in column "label" of relation "test_entity" violates not-null constraint',
            });
        }
    });
});
