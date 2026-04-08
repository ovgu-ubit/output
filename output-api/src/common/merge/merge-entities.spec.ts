import { HttpException } from '@nestjs/common';
import { ApiErrorCode } from '../../../../output-interfaces/ApiError';
import { mergeEntities } from './merge-entities';

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
