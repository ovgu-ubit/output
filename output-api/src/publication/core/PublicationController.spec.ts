import { BadRequestException } from '@nestjs/common';
import { PublicationController } from './PublicationController';

describe('PublicationController', () => {
    let controller: PublicationController;
    let publicationChangeService: { getPublicationChangesForPublication: jest.Mock };

    beforeEach(() => {
        publicationChangeService = {
            getPublicationChangesForPublication: jest.fn(),
        };

        controller = new PublicationController(
            {} as any,
            {} as any,
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
});
