import { PublicationChangeService } from './publication-change.service';
import { Publication } from './Publication.entity';

describe('PublicationChangeService', () => {
    let service: PublicationChangeService;
    let publicationRepository: { find: jest.Mock };
    let publicationChangeRepository: { save: jest.Mock };
    let workflowReportRepository: { existsBy: jest.Mock };

    beforeEach(() => {
        publicationRepository = {
            find: jest.fn(async () => []),
        };
        publicationChangeRepository = {
            save: jest.fn(async (change) => change),
        };
        workflowReportRepository = {
            existsBy: jest.fn(async () => true),
        };

        service = new PublicationChangeService(
            publicationRepository as never,
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

    it('ignores logically empty changes and relation row id churn when building patches', () => {
        const author = { id: 101, last_name: 'Doe', first_name: 'Jane' } as any;
        const before = {
            id: 9,
            add_info: null,
            identifiers: [],
            supplements: [],
            authorPublications: [{ id: 1, authorId: 101, author, corresponding: true }],
        } as Publication;
        const after = {
            id: 9,
            add_info: '',
            identifiers: [],
            supplements: [],
            authorPublications: [{ id: 2, authorId: 101, author, corresponding: true }],
        } as Publication;

        expect(service.buildPublicationChangePatch(before, after)).toBeNull();
    });
});
