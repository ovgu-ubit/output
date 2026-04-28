import { PublicationChangeService } from './publication-change.service';

describe('PublicationChangeService', () => {
    let service: PublicationChangeService;
    let publicationChangeRepository: { save: jest.Mock };
    let workflowReportRepository: { existsBy: jest.Mock };

    beforeEach(() => {
        publicationChangeRepository = {
            save: jest.fn(async (change) => change),
        };
        workflowReportRepository = {
            existsBy: jest.fn(async () => true),
        };

        service = new PublicationChangeService(
            publicationChangeRepository as never,
            workflowReportRepository as never,
        );
    });

    it('stores only the generic user marker for user-triggered changes', async () => {
        await service.createPublicationChange({
            publication: { id: 7 },
            by_user: 'alice',
            patch_data: {
                action: 'update',
                before: { title: 'Before' },
                after: { title: 'After' },
            },
        });

        expect(publicationChangeRepository.save).toHaveBeenCalledWith(expect.objectContaining({
            by_user: 'user',
        }));
    });
});
