import { HttpException } from '@nestjs/common';
import { ApiErrorCode } from '../../../../output-interfaces/ApiError';
import { PublicationController } from './PublicationController';

describe('PublicationController', () => {
    let controller: PublicationController;
    let publicationService: { save: jest.Mock; getDuplicates: jest.Mock; getAllDuplicates: jest.Mock; getPublication: jest.Mock };
    let publicationChangeService: { getPublicationChangesForPublication: jest.Mock };

    beforeEach(() => {
        publicationService = {
            save: jest.fn(),
            getDuplicates: jest.fn(),
            getAllDuplicates: jest.fn(),
            getPublication: jest.fn(),
        };
        publicationChangeService = {
            getPublicationChangesForPublication: jest.fn(),
        };

        controller = new PublicationController(
            {} as any,
            publicationService as any,
            publicationChangeService as any,
            { get: jest.fn() } as any,
            { get: jest.fn() } as any,
            [],
        );
    });

    it('returns publication changes for a publication id', async () => {
        const changes = [{ id: 1, publicationId: 42 }];
        publicationChangeService.getPublicationChangesForPublication.mockResolvedValue(changes);

        await expect(controller.changes(42)).resolves.toEqual(changes);
        expect(publicationChangeService.getPublicationChangesForPublication).toHaveBeenCalledWith(42);
    });

    it('throws when no publication id is provided', async () => {
        try {
            await controller.changes(undefined);
            fail('controller.changes should reject missing publication ids');
        } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getResponse()).toMatchObject({
                statusCode: 400,
                code: ApiErrorCode.INVALID_REQUEST,
            });
        }
        expect(publicationChangeService.getPublicationChangesForPublication).not.toHaveBeenCalled();
    });

    it('rejects create requests that provide id 0', async () => {
        try {
            await controller.save({ id: 0, title: 'Existing' } as any, { user: { username: 'alice' } } as any);
            fail('controller.save should reject create requests with id 0');
        } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getResponse()).toMatchObject({
                statusCode: 400,
                code: ApiErrorCode.INVALID_REQUEST,
            });
        }
        expect(publicationService.save).not.toHaveBeenCalled();
    });

    it('throws a structured not-found error when a publication is missing', async () => {
        publicationService.getPublication.mockResolvedValue(null);

        try {
            await controller.one(123, { user: { read: true, write_publication: true, username: 'alice' } } as any);
            fail('controller.one should reject missing publications');
        } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getResponse()).toMatchObject({
                statusCode: 404,
                code: ApiErrorCode.NOT_FOUND,
            });
        }
    });

    it('treats duplicate id 0 as a provided id instead of loading all duplicates', async () => {
        publicationService.getDuplicates.mockResolvedValue([{ id: 7 }]);

        await expect(controller.duplicates(0)).resolves.toEqual([{ id: 7 }]);
        expect(publicationService.getDuplicates).toHaveBeenCalledWith(0);
        expect(publicationService.getAllDuplicates).not.toHaveBeenCalled();
    });
});
