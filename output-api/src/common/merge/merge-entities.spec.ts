import { HttpException } from '@nestjs/common';
import {  ApiErrorCode  } from '@output/interfaces';
import { mergeEntities } from './merge-entities';
import { EditLockOwnerStore } from '../edit-lock';

type MergeEntity = {
    id: number;
    label?: string | null;
};

const expectApiError = async (
    promise: Promise<unknown>,
    expected: {
        statusCode: number;
        code: ApiErrorCode;
    },
) => {
    try {
        await promise;
        fail(`Expected promise to reject with ${expected.code}`);
    } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getResponse()).toMatchObject(expected);
    }
};

describe('mergeEntities', () => {
    let repository: {
        findOne: jest.Mock;
        save: jest.Mock;
        delete: jest.Mock;
    };

    beforeEach(() => {
        EditLockOwnerStore.clear();
        repository = {
            findOne: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
        };
    });

    it('throws NOT_FOUND when the primary entity is missing', async () => {
        repository.findOne.mockResolvedValue(null);

        await expectApiError(mergeEntities<MergeEntity>({
            repository: repository as any,
            primaryId: 1,
            duplicateIds: [2],
            mergeContext: {},
        }), {
            statusCode: 404,
            code: ApiErrorCode.NOT_FOUND,
        });
    });

    it('throws NOT_FOUND when any duplicate entity is missing', async () => {
        repository.findOne
            .mockResolvedValueOnce({ id: 1, label: 'Primary' })
            .mockResolvedValueOnce(null);

        await expectApiError(mergeEntities<MergeEntity>({
            repository: repository as any,
            primaryId: 1,
            duplicateIds: [2],
            mergeContext: {},
        }), {
            statusCode: 404,
            code: ApiErrorCode.NOT_FOUND,
        });
    });

    it('maps persistence failures on save to the shared API error format', async () => {
        repository.findOne
            .mockResolvedValueOnce({ id: 1, label: 'Primary' })
            .mockResolvedValueOnce({ id: 2, label: 'Duplicate' });
        repository.save.mockRejectedValue({
            code: '23505',
            detail: 'Key (label)=(Primary) already exists.',
            constraint: 'uq_merge_label',
        });

        try {
            await mergeEntities<MergeEntity>({
                repository: repository as any,
                primaryId: 1,
                duplicateIds: [2],
                mergeContext: {},
            });
            fail('mergeEntities should reject save persistence failures');
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

    it('throws INTERNAL_ERROR when cleanup after save fails', async () => {
        repository.findOne
            .mockResolvedValueOnce({ id: 1, label: 'Primary' })
            .mockResolvedValueOnce({ id: 2, label: 'Duplicate' });
        repository.save.mockResolvedValue({ id: 1, label: 'Primary' });
        repository.delete.mockRejectedValue(new Error('delete failed'));

        await expectApiError(mergeEntities<MergeEntity>({
            repository: repository as any,
            primaryId: 1,
            duplicateIds: [2],
            mergeContext: {},
        }), {
            statusCode: 500,
            code: ApiErrorCode.INTERNAL_ERROR,
        });
    });
});

describe('merge edit locks', () => {
    const primary = { id: 1, label: 'Primary', locked_at: null as Date | null };
    const duplicate = { id: 2, label: 'Duplicate', locked_at: null as Date | null };
    let repository: { metadata: { tableName: string }; findOne: jest.Mock; save: jest.Mock; delete: jest.Mock };
    let manager: { getRepository: jest.Mock };
    const publicationService = { save: jest.fn() };

    beforeEach(() => {
        EditLockOwnerStore.clear();
        jest.clearAllMocks();
        primary.locked_at = null;
        duplicate.locked_at = null;
        repository = {
            metadata: { tableName: 'funder' },
            findOne: jest.fn(async ({ where }) => where.id === 1 ? primary : where.id === 2 ? duplicate : null),
            save: jest.fn(async value => value), delete: jest.fn(),
        };
        manager = { getRepository: jest.fn(() => repository) };
    });

    afterEach(() => EditLockOwnerStore.clear());

    const merge = (user: string | undefined = 'alice') => mergeEntities({
        repository: repository as any, manager: manager as any, primaryId: 1, duplicateIds: [2],
        editLockTimeoutMs: 5 * 60000, by_user: user, mergeContext: {},
    });

    it('accepts active locks owned by the caller and locks rows in a stable order', async () => {
        primary.locked_at = duplicate.locked_at = new Date();
        EditLockOwnerStore.setOwner('funder', 1, 'alice');
        EditLockOwnerStore.setOwner('funder', 2, 'alice');
        await expect(merge()).resolves.toMatchObject({ id: 1 });
        expect(repository.findOne).toHaveBeenNthCalledWith(1, { where: { id: 1 }, lock: { mode: 'pessimistic_write' } });
        expect(repository.findOne).toHaveBeenNthCalledWith(2, { where: { id: 2 }, lock: { mode: 'pessimistic_write' } });
    });

    it.each([1, 2])('rejects a foreign active lock on entity %s before any changes', async id => {
        (id === 1 ? primary : duplicate).locked_at = new Date();
        EditLockOwnerStore.setOwner('funder', id, 'bob');
        await expect(merge()).rejects.toMatchObject({ status: 409 });
        expect(repository.save).not.toHaveBeenCalled();
        expect(repository.delete).not.toHaveBeenCalled();
    });

    it('rejects active locks with unknown ownership', async () => {
        duplicate.locked_at = new Date();
        await expect(merge()).rejects.toMatchObject({ status: 409 });
    });

    it('accepts expired locks', async () => {
        duplicate.locked_at = new Date(Date.now() - 6 * 60000);
        EditLockOwnerStore.setOwner('funder', 2, 'bob');
        await expect(merge()).resolves.toMatchObject({ id: 1 });
    });

    it('forwards the caller and transaction when reassigning publications', async () => {
        repository.findOne.mockImplementation(async ({ where }) => where.id === 1 ? primary
            : { ...duplicate, publications: [{ id: 10 }] });
        await mergeEntities({ repository: repository as any, manager: manager as any, primaryId: 1, duplicateIds: [2],
            editLockTimeoutMs: 5 * 60000, by_user: 'alice', mergeContext: { field: 'publisher', service: publicationService as any } });
        expect(publicationService.save).toHaveBeenCalledWith([{ id: 10, publisher: primary }], { manager, by_user: 'alice' });
    });
});
