import { HttpException } from '@nestjs/common';
import {  ApiErrorCode  } from '@output/interfaces';
import { PublicationController } from './PublicationController';

describe('PublicationController', () => {
    let controller: PublicationController;
    let publicationService: { saveOne: jest.Mock; getDuplicateEntries: jest.Mock; getPublicationOrFail: jest.Mock; getPublicationChanges: jest.Mock; combine: jest.Mock };
    let publicationIndexService: { getAllForReportingYear: jest.Mock; getIndexEntries: jest.Mock; getReportingYears: jest.Mock; filterIndex: jest.Mock };
    let publicationFilterService: { listDefinitions: jest.Mock; applyPaths: jest.Mock };

    beforeEach(() => {
        publicationService = {
            saveOne: jest.fn(),
            getDuplicateEntries: jest.fn(),
            getPublicationOrFail: jest.fn(),
            getPublicationChanges: jest.fn(),
            combine: jest.fn(),
        };
        publicationIndexService = {
            getAllForReportingYear: jest.fn(),
            getIndexEntries: jest.fn(),
            getReportingYears: jest.fn(),
            filterIndex: jest.fn(),
        };
        publicationFilterService = {
            listDefinitions: jest.fn(),
            applyPaths: jest.fn(),
        };

        controller = new PublicationController(
            publicationService as any,
            publicationIndexService as any,
            publicationFilterService as any,
        );
    });

    it('returns publication changes for a publication id', async () => {
        const changes = [{ id: 1, publicationId: 42 }];
        publicationService.getPublicationChanges.mockResolvedValue(changes);

        await expect(controller.changes(42)).resolves.toEqual(changes);
        expect(publicationService.getPublicationChanges).toHaveBeenCalledWith(42);
    });

    it('propagates change lookup errors from the service', async () => {
        const error = new HttpException({
            statusCode: 400,
            code: ApiErrorCode.INVALID_REQUEST,
        }, 400);
        publicationService.getPublicationChanges.mockRejectedValue(error);

        try {
            await controller.changes(undefined as any);
            fail('controller.changes should propagate service errors');
        } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getResponse()).toMatchObject({
                statusCode: 400,
                code: ApiErrorCode.INVALID_REQUEST,
            });
        }
        expect(publicationService.getPublicationChanges).toHaveBeenCalledWith(undefined);
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
        expect(publicationService.saveOne).not.toHaveBeenCalled();
    });

    it('propagates not-found errors from the publication service', async () => {
        const error = new HttpException({
            statusCode: 404,
            code: ApiErrorCode.NOT_FOUND,
        }, 404);
        publicationService.getPublicationOrFail.mockRejectedValue(error);

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

    it('delegates duplicate lookup to the publication service', async () => {
        publicationService.getDuplicateEntries.mockResolvedValue([{ id: 7 }]);

        await expect(controller.duplicates(0)).resolves.toEqual([{ id: 7 }]);
        expect(publicationService.getDuplicateEntries).toHaveBeenCalledWith(0, undefined);
    });

    it('passes the ignoreLocks flag to publication combine', async () => {
        publicationService.combine.mockResolvedValue({ id: 1 });

        await expect(controller.combine(1, [2], true)).resolves.toEqual({ id: 1 });

        expect(publicationService.combine).toHaveBeenCalledWith(1, [2], undefined, { ignoreLocks: true });
    });
});
