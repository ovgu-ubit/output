import { publicationGrossAmountSql } from '../../invoice/invoice-costs';
import { PublicationIndexService } from './publication-index.service';
import { Publication } from './Publication.entity';
import { CompareOperation, JoinOperation, PublicationIndexPageRequest } from '@output/interfaces';
import { DataSource, SelectQueryBuilder } from 'typeorm';

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

        it('searches only the columns with UI filters', async () => {
            const source = sourceQuery();
            const wrapper = pageQuery();
            jest.spyOn(service, 'indexQuery').mockResolvedValue(source as any);
            pubRepository.manager.createQueryBuilder.mockReturnValue(wrapper.query);
            await service.getIndexPage({ all_reporting_years: true, q: 'Alpha', search_columns: ['title'] });
            const where = { where: jest.fn(), orWhere: jest.fn() };
            wrapper.query.andWhere.mock.calls[0][0].whereFactory(where);
            expect(where.where).toHaveBeenCalledTimes(1);
            expect(where.where).toHaveBeenCalledWith(expect.stringContaining('publication_index."title"'));
            expect(where.orWhere).not.toHaveBeenCalled();
        });

        it('does not search any columns when none have UI filters', async () => {
            jest.spyOn(service, 'indexQuery').mockResolvedValue(sourceQuery() as any);
            const wrapper = pageQuery();
            pubRepository.manager.createQueryBuilder.mockReturnValue(wrapper.query);
            await service.getIndexPage({ all_reporting_years: true, q: 'Alpha', search_columns: [] });
            expect(wrapper.query.andWhere).toHaveBeenCalledWith('FALSE');
        });

        it('rejects search columns outside the permitted projection', async () => {
            jest.spyOn(service, 'indexQuery').mockResolvedValue(sourceQuery() as any);
            await expect(service.getIndexPage({ q: 'Alpha', all_reporting_years: true, search_columns: ['net_costs'] }))
                .rejects.toMatchObject({ status: 400 });
        });

        it.each([
            { reporting_year: 2026 },
            { reporting_year: null },
            { soft: true },
            { all_reporting_years: true, paths: ['missing-institute'] },
            { reporting_year: 2026, paths: ['missing-institute'] },
        ] as PublicationIndexPageRequest[])('groups OR expressions before applying scopes %#', async scope => {
            // A real query builder verifies SQL precedence and parameter binding without a database connection.
            const database = new DataSource({ type: 'postgres' });
            const source = new SelectQueryBuilder<Publication>(database)
                .select('publication.id', 'id')
                .from('publication', 'publication');
            jest.spyOn(service, 'indexQuery').mockResolvedValue(source);
            pubRepository.manager.createQueryBuilder.mockReturnValue(pageQuery().query);
            publicationFilterService.applyPathsToQuery.mockImplementation(query => {
                if (scope.paths?.length) query.andWhere('publication.id <> :path_excluded', { path_excluded: 7 });
                return query;
            });

            await service.getIndexPage({
                ...scope,
                filter: { expressions: [
                    { key: 'title', comp: CompareOperation.EQUALS, value: 'Alpha', op: JoinOperation.AND },
                    { key: 'doi', comp: CompareOperation.EQUALS, value: '10.1234/beta', op: JoinOperation.OR },
                ] },
            });

            const sql = source.getQuery().replace(/"/g, '');
            expect(sql).toContain('WHERE (publication.title = :filter_0 OR publication.doi = :filter_1)');
            expect(source.getParameters()).toMatchObject({ filter_0: 'Alpha', filter_1: '10.1234/beta' });
            if (scope.soft) expect(sql).toContain('AND publication.delete_date IS NOT NULL');
            expect(sql).not.toContain(':pageBeginDate');
            expect(sql).not.toContain('publication.pub_date IS NULL');
            if (scope.paths?.length) expect(sql).toContain('AND publication.id <> :path_excluded');
        });

        it.each([2026, null, undefined])('ignores the reporting year for saved filter paths (%s)', async reporting_year => {
            const source = new SelectQueryBuilder<Publication>(new DataSource({ type: 'postgres' }))
                .select('publication.id', 'id').from('publication', 'publication');
            jest.spyOn(service, 'indexQuery').mockResolvedValue(source);
            pubRepository.manager.createQueryBuilder.mockReturnValue(pageQuery().query);
            await service.getIndexPage({ reporting_year, all_reporting_years: false, paths: ['missing-institute'] });
            expect(source.getQuery()).not.toContain('pub_date');
            expect(configService.get).not.toHaveBeenCalled();
            expect(publicationFilterService.applyPathsToQuery).toHaveBeenCalledWith(source, ['missing-institute']);
        });

        it('honors explicit date expressions independently of the reporting year', async () => {
            const source = new SelectQueryBuilder<Publication>(new DataSource({ type: 'postgres' }))
                .select('publication.id', 'id').from('publication', 'publication');
            jest.spyOn(service, 'indexQuery').mockResolvedValue(source);
            pubRepository.manager.createQueryBuilder.mockReturnValue(pageQuery().query);
            await service.getIndexPage({ reporting_year: 2026, filter: { expressions: [
                { key: 'pub_date', comp: CompareOperation.GREATER_THAN, value: '2020-01-01', op: JoinOperation.AND },
                { key: 'pub_date', comp: CompareOperation.SMALLER_THAN, value: '2021-01-01', op: JoinOperation.AND },
            ] } });
            expect(source.getQuery()).toContain('publication.pub_date > :filter_0');
            expect(source.getQuery()).toContain('publication.pub_date < :filter_1');
            expect(source.getParameters()).toMatchObject({ filter_0: '2020-01-01', filter_1: '2021-01-01' });
            expect(source.getQuery()).not.toContain(':pageBeginDate');
        });

        it.each([2026, null])('keeps the reporting-year scope for ordinary table searches (%s)', async reporting_year => {
            const source = new SelectQueryBuilder<Publication>(new DataSource({ type: 'postgres' }))
                .select('publication.id', 'id').from('publication', 'publication');
            jest.spyOn(service, 'indexQuery').mockResolvedValue(source);
            pubRepository.manager.createQueryBuilder.mockReturnValue(pageQuery().query);
            await service.getIndexPage({ reporting_year, filter: { expressions: [] }, paths: [], q: 'Alpha', column_filters: { id: '7' } });
            expect(source.getQuery()).toContain(reporting_year ? ':pageBeginDate' : 'publication.pub_date IS NULL');
        });
    });
});
