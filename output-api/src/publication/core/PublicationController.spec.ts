import { BadRequestException } from '@nestjs/common';
import { PublicationController } from './PublicationController';

describe('PublicationController', () => {
    let controller: PublicationController;
    let publicationService: { save: jest.Mock; getDuplicates: jest.Mock; getAllDuplicates: jest.Mock };
    let publicationChangeService: { getPublicationChangesForPublication: jest.Mock };

    beforeEach(() => {
        publicationService = {
            save: jest.fn(),
            getDuplicates: jest.fn(),
            getAllDuplicates: jest.fn(),
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
        await expect(controller.changes(undefined)).rejects.toBeInstanceOf(BadRequestException);
        expect(publicationChangeService.getPublicationChangesForPublication).not.toHaveBeenCalled();
    });

    it('rejects create requests that provide id 0', async () => {
        await expect(controller.save({ id: 0, title: 'Existing' } as any, { user: { username: 'alice' } } as any))
            .rejects.toBeInstanceOf(BadRequestException);
        expect(publicationService.save).not.toHaveBeenCalled();
    });

    it('treats duplicate id 0 as a provided id instead of loading all duplicates', async () => {
        publicationService.getDuplicates.mockResolvedValue([{ id: 7 }]);

        await expect(controller.duplicates(0)).resolves.toEqual([{ id: 7 }]);
        expect(publicationService.getDuplicates).toHaveBeenCalledWith(0);
        expect(publicationService.getAllDuplicates).not.toHaveBeenCalled();
    });
});
