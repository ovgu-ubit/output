import { publicationGrossAmountSql } from '../../invoice/invoice-costs';
import { PublicationIndexService } from './publication-index.service';
import { Publication } from './Publication.entity';

describe('PublicationIndexService', () => {
    let service: PublicationIndexService;
    let pubRepository: { find: jest.Mock; createQueryBuilder: jest.Mock; manager: { createQueryBuilder: jest.Mock } };
    let configService: { get: jest.Mock };
    let instituteService: { findInstituteIdsIncludingSubInstitutes: jest.Mock };
    let publicationFilterService: { applyPathsToQuery: jest.Mock };

    beforeEach(() => {
        pubRepository = {
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
            manager: { createQueryBuilder: jest.fn() },
        };
        configService = {
            get: jest.fn(),
        };
        instituteService = {
            findInstituteIdsIncludingSubInstitutes: jest.fn(),
        };
        publicationFilterService = {
            applyPathsToQuery: jest.fn((query) => query),
        };

        service = new PublicationIndexService(
            pubRepository as any,
            configService as any,
            instituteService as any,
            publicationFilterService as any,
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

    it('preserves database errors so the global exception filter can log their cause', async () => {
        const databaseError = new Error('database query failed');
        pubRepository.find.mockRejectedValue(databaseError);

        await expect(service.getAllForReportingYear(2026, false)).rejects.toBe(databaseError);
    });

    it('does not pass non-boolean permission values to TypeORM relations', async () => {
        const publication = publicationWithInternalRemark();
        pubRepository.find.mockResolvedValue([publication]);

        await service.getAllForReportingYear(2026, { rolename: 'reader' } as any);

        expect(pubRepository.find).toHaveBeenCalledWith(expect.objectContaining({
            relations: expect.objectContaining({ invoices: false }),
        }));
        expect(publication.authorPublications[0].author.internal_remark).toBeUndefined();
    });

    describe('indexQuery', () => {
        const createQueryBuilderMock = () => ({
            leftJoin: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            addGroupBy: jest.fn().mockReturnThis(),
        });

        it('selects gross costs for reader users when the index column is enabled', async () => {
            const queryBuilder = createQueryBuilderMock();
            pubRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
            configService.get.mockResolvedValue({ net_costs: true });

            await service.indexQuery(undefined, true);

            expect(queryBuilder.addSelect).toHaveBeenCalledWith(
                publicationGrossAmountSql(),
                'net_costs',
            );
        });

        it('does not select gross costs for public users even when the index column is enabled', async () => {
            const queryBuilder = createQueryBuilderMock();
            pubRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
            configService.get.mockResolvedValue({ net_costs: true });

            await service.indexQuery(undefined, false);

            expect(queryBuilder.addSelect).not.toHaveBeenCalledWith(expect.any(String), 'net_costs');
        });
    });

    describe('getIndexPage', () => {
        const sourceQuery = () => ({
            expressionMap: { selects: [{ aliasName: 'id' }, { aliasName: 'title' }, { aliasName: 'status' }] },
            getQuery: jest.fn().mockReturnValue('SELECT publication.id AS id FROM publication publication'),
            getParameters: jest.fn().mockReturnValue({}),
            andWhere: jest.fn().mockReturnThis(),
            withDeleted: jest.fn().mockReturnThis(),
        });

        const pageQuery = () => {
            const count: any = {
                select: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValue({ total: '23' }),
            };
            const query: any = {
                select: jest.fn().mockReturnThis(),
                from: jest.fn().mockReturnThis(),
                setParameters: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                clone: jest.fn().mockReturnValue(count),
                addOrderBy: jest.fn().mockReturnThis(),
                offset: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([{ id: 7, title: 'Alpha', status: 1 }]),
            };
            return { query, count };
        };

        it('returns a stable page and applies table search, filters and multi-sort', async () => {
            const source = sourceQuery();
            const wrapper = pageQuery();
            jest.spyOn(service, 'indexQuery').mockResolvedValue(source as any);
            pubRepository.manager.createQueryBuilder.mockReturnValue(wrapper.query);

            const result = await service.getIndexPage({
                page: 1,
                page_size: 10,
                all_reporting_years: true,
                q: 'Alpha',
                column_filters: { title: 'Beta*' },
                sort: [{ key: 'status', direction: 'desc' }],
                paths: ['missing-inst_auth'],
            });

            expect(publicationFilterService.applyPathsToQuery).toHaveBeenCalledWith(source, ['missing-inst_auth']);
            expect(wrapper.query.andWhere).toHaveBeenCalledTimes(2);
            expect(wrapper.query.andWhere.mock.calls[1][1]).toEqual({ index_column_filter_0: 'Beta%' });
            expect(wrapper.query.addOrderBy).toHaveBeenNthCalledWith(1, 'publication_index."status"', 'DESC', 'NULLS LAST');
            expect(wrapper.query.addOrderBy).toHaveBeenNthCalledWith(2, 'publication_index."id"', 'ASC');
            expect(wrapper.query.offset).toHaveBeenCalledWith(10);
            expect(wrapper.query.limit).toHaveBeenCalledWith(10);
            expect(result).toEqual({
                items: [{ id: 7, title: 'Alpha', status: 1 }],
                total: 23,
                page: 1,
                page_size: 10,
            });
        });

        it('rejects columns that are not part of the configured projection', async () => {
            const source = sourceQuery();
            jest.spyOn(service, 'indexQuery').mockResolvedValue(source as any);
            pubRepository.manager.createQueryBuilder.mockReturnValue(pageQuery().query);

            await expect(service.getIndexPage({
                page: 0,
                page_size: 10,
                all_reporting_years: true,
                sort: [{ key: 'doi', direction: 'asc' }],
            })).rejects.toMatchObject({ status: 400 });
        });
    });
});
