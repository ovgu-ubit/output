import { PublicationIndexService } from './publication-index.service';
import { Publication } from './Publication.entity';

describe('PublicationIndexService', () => {
    let service: PublicationIndexService;
    let pubRepository: { find: jest.Mock; createQueryBuilder: jest.Mock };
    let configService: { get: jest.Mock };
    let instituteService: { findInstituteIdsIncludingSubInstitutes: jest.Mock };

    beforeEach(() => {
        pubRepository = {
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
        };
        configService = {
            get: jest.fn(),
        };
        instituteService = {
            findInstituteIdsIncludingSubInstitutes: jest.fn(),
        };

        service = new PublicationIndexService(
            pubRepository as any,
            configService as any,
            instituteService as any,
        );
    });

    const publicationWithInternalRemark = (): Publication => ({
        id: 1,
        authorPublications: [{
            id: 2,
            author: {
                id: 3,
                first_name: 'Ada',
                last_name: 'Lovelace',
                internal_remark: 'internal person remark',
            },
        }],
    }) as Publication;

    it('strips nested author internal remarks from reporting-year lists for non-readers', async () => {
        const publication = publicationWithInternalRemark();
        pubRepository.find.mockResolvedValue([publication]);

        const result = await service.getAllForReportingYear(2026, false);

        expect(result[0].authorPublications[0].author.internal_remark).toBeUndefined();
        expect(pubRepository.find).toHaveBeenCalledWith(expect.objectContaining({
            relations: expect.objectContaining({
                invoices: false,
                authorPublications: {
                    author: true,
                    institute: true,
                },
            }),
        }));
    });

    it('keeps nested author internal remarks from reporting-year lists for readers', async () => {
        const publication = publicationWithInternalRemark();
        pubRepository.find.mockResolvedValue([publication]);

        const result = await service.getAllForReportingYear(2026, true);

        expect(result[0].authorPublications[0].author.internal_remark).toBe('internal person remark');
        expect(pubRepository.find).toHaveBeenCalledWith(expect.objectContaining({
            relations: expect.objectContaining({
                invoices: true,
            }),
        }));
    });

    describe('indexQuery', () => {
        const createQueryBuilderMock = () => ({
            leftJoin: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            addGroupBy: jest.fn().mockReturnThis(),
        });

        it('selects net costs for reader users when the index column is enabled', async () => {
            const queryBuilder = createQueryBuilderMock();
            pubRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
            configService.get.mockResolvedValue({ net_costs: true });

            await service.indexQuery(undefined, true);

            expect(queryBuilder.addSelect).toHaveBeenCalledWith(
                'COALESCE((SELECT SUM(net_cost_item.euro_value) FROM cost_item net_cost_item INNER JOIN "invoice" net_invoice ON net_cost_item."invoiceId" = net_invoice.id WHERE net_invoice."publicationId" = publication.id), 0)',
                'net_costs',
            );
        });

        it('does not select net costs for public users even when the index column is enabled', async () => {
            const queryBuilder = createQueryBuilderMock();
            pubRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
            configService.get.mockResolvedValue({ net_costs: true });

            await service.indexQuery(undefined, false);

            expect(queryBuilder.addSelect).not.toHaveBeenCalledWith(expect.any(String), 'net_costs');
        });
    });
});
