import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { StatisticsService } from './statistics.service';
import { Publication } from '../publication/core/Publication.entity';
import { InstituteService } from '../institute/institute.service';
import {  GROUP, STATISTIC, TIMEFRAME  } from '@output/interfaces';

describe('StatisticsService', () => {
    let service: StatisticsService;
    let repository: { createQueryBuilder: jest.Mock };
    let instituteService: { findInstituteIdsIncludingSubInstitutes: jest.Mock };

    const createQueryBuilderMock = () => {
        const queryBuilder = {
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            leftJoin: jest.fn().mockReturnThis(),
            innerJoin: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            addGroupBy: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            addOrderBy: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            setParameters: jest.fn().mockReturnThis(),
            getRawMany: jest.fn().mockResolvedValue([]),
            expressionMap: {
                mainAlias: { name: 'publication' },
                joinAttributes: [],
            },
        };

        return queryBuilder;
    };

    beforeEach(async () => {
        repository = {
            createQueryBuilder: jest.fn(),
        };
        instituteService = {
            findInstituteIdsIncludingSubInstitutes: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StatisticsService,
                { provide: getRepositoryToken(Publication), useValue: repository },
                { provide: InstituteService, useValue: instituteService },
            ],
        }).compile();

        service = module.get(StatisticsService);
    });

    it('expands institute filters with sub institutes before applying the statistics query', async () => {
        const queryBuilder = createQueryBuilderMock();
        repository.createQueryBuilder.mockReturnValue(queryBuilder);
        instituteService.findInstituteIdsIncludingSubInstitutes.mockResolvedValue([11, 12, 13]);

        await service.publication_statistic(2025, STATISTIC.COUNT, [], TIMEFRAME.CURRENT_YEAR, { instituteId: [11] });

        expect(instituteService.findInstituteIdsIncludingSubInstitutes).toHaveBeenCalledWith([11]);
        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
            'tmp.institute_id::integer[] && ARRAY[:...instituteId]::integer[]',
            { instituteId: [11, 12, 13] }
        );
    });

    it('expands institute highlights with sub institutes before calculating the highlight series', async () => {
        const queryBuilder = createQueryBuilderMock();
        repository.createQueryBuilder.mockReturnValue(queryBuilder);
        instituteService.findInstituteIdsIncludingSubInstitutes.mockResolvedValue([21, 22]);

        await service.publication_statistic(2025, STATISTIC.COUNT, [], TIMEFRAME.CURRENT_YEAR, undefined, { instituteId: 21 } as any);

        expect(instituteService.findInstituteIdsIncludingSubInstitutes).toHaveBeenCalledWith([21]);
        expect(queryBuilder.addSelect).toHaveBeenCalledWith(
            expect.stringContaining('tmp.institute_id::integer[] && ARRAY[:...highlightInstituteIds]::integer[]'),
            'highlight'
        );
        expect(queryBuilder.setParameters).toHaveBeenCalledWith({ highlightInstituteIds: [21, 22] });
    });

    it('filters three-year reports via a bound reporting year array', async () => {
        const queryBuilder = createQueryBuilderMock();
        repository.createQueryBuilder.mockReturnValue(queryBuilder);

        await service.publication_statistic(2025, STATISTIC.COUNT, [], TIMEFRAME.THREE_YEAR_REPORT);

        expect(queryBuilder.where).toHaveBeenCalledWith(
            expect.stringContaining('IN (:...reportingYears)'),
            { reportingYears: [2025, 2024, 2023] }
        );
    });

    it('keeps publisher null-values when publisher filters explicitly include null', async () => {
        const queryBuilder = createQueryBuilderMock();
        repository.createQueryBuilder.mockReturnValue(queryBuilder);

        await service.publication_statistic(2025, STATISTIC.COUNT, [], TIMEFRAME.CURRENT_YEAR, { publisherId: [7, null] as any });

        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
            '(publication."publisherId" IS NULL OR publication."publisherId" IN (:...publisherId))',
            { publisherId: [7] }
        );
    });

    it('uses the corresponding=false filter with an author-publication inner join', async () => {
        const queryBuilder = createQueryBuilderMock();
        repository.createQueryBuilder.mockReturnValue(queryBuilder);

        await service.publication_statistic(2025, STATISTIC.COUNT, [], TIMEFRAME.CURRENT_YEAR, { corresponding: false });

        expect(queryBuilder.andWhere).toHaveBeenCalledWith('array_position(corresponding, true) is null');
        expect(queryBuilder.innerJoin).toHaveBeenCalledWith(service.autPubSubQuery, 'tmp', 'tmp.p_id = publication.id');
    });

    it('binds publisher highlight ids instead of embedding them directly', async () => {
        const queryBuilder = createQueryBuilderMock();
        repository.createQueryBuilder.mockReturnValue(queryBuilder);

        await service.publication_statistic(2025, STATISTIC.COUNT, [], TIMEFRAME.CURRENT_YEAR, undefined, { publisherId: 14 } as any);

        expect(queryBuilder.addSelect).toHaveBeenCalledWith(
            expect.stringContaining('publication."publisherId" = :highlightPublisherId'),
            'highlight'
        );
        expect(queryBuilder.setParameters).toHaveBeenCalledWith({ highlightPublisherId: 14 });
    });

    it('groups publication statistics by cost center through invoices', async () => {
        const queryBuilder = createQueryBuilderMock();
        repository.createQueryBuilder.mockReturnValue(queryBuilder);

        await service.publication_statistic(2025, STATISTIC.COUNT, [GROUP.COST_CENTER], TIMEFRAME.CURRENT_YEAR);

        expect(queryBuilder.leftJoin).toHaveBeenCalledWith('publication.invoices', 'invoice');
        expect(queryBuilder.leftJoin).toHaveBeenCalledWith('invoice.cost_center', 'cost_center');
        expect(queryBuilder.addSelect).toHaveBeenCalledWith(
            "case when cost_center.label is not null then cost_center.label else 'Unbekannt' end",
            'cost_center'
        );
        expect(queryBuilder.addSelect).toHaveBeenCalledWith('cost_center.id', 'cost_center_id');
    });

    it('filters publication statistics by cost center', async () => {
        const queryBuilder = createQueryBuilderMock();
        repository.createQueryBuilder.mockReturnValue(queryBuilder);

        await service.publication_statistic(2025, STATISTIC.COUNT, [], TIMEFRAME.CURRENT_YEAR, { costCenterId: [5] });

        expect(queryBuilder.leftJoin).toHaveBeenCalledWith('publication.invoices', 'invoice');
        expect(queryBuilder.leftJoin).toHaveBeenCalledWith('invoice.cost_center', 'cost_center');
        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
            'cost_center.id IN (:...costCenterId)',
            { costCenterId: [5] }
        );
    });
    
    it('excludes cost centers at publication level', async () => {
        const queryBuilder = createQueryBuilderMock();
        repository.createQueryBuilder.mockReturnValue(queryBuilder);

        await service.publication_statistic(2025, STATISTIC.COUNT, [], TIMEFRAME.CURRENT_YEAR, { notCostCenterId: [5] });

        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
            'NOT EXISTS (SELECT 1 FROM invoice excluded_invoice WHERE excluded_invoice."publicationId" = publication.id AND excluded_invoice."costCenterId" IN (:...notCostCenterId))',
            { notCostCenterId: [5] }
        );
        expect(queryBuilder.andWhere).not.toHaveBeenCalledWith(
            '(cost_center.id NOT IN (:...notCostCenterId) OR cost_center.id IS NULL)',
            { notCostCenterId: [5] }
        );
    });

    it('excludes unknown cost centers at publication level', async () => {
        const queryBuilder = createQueryBuilderMock();
        repository.createQueryBuilder.mockReturnValue(queryBuilder);

        await service.publication_statistic(2025, STATISTIC.COUNT, [], TIMEFRAME.CURRENT_YEAR, { notCostCenterId: [null] as any });

        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
            'EXISTS (SELECT 1 FROM invoice included_invoice WHERE included_invoice."publicationId" = publication.id AND included_invoice."costCenterId" IS NOT NULL)'
        );
        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
            'NOT EXISTS (SELECT 1 FROM invoice excluded_invoice WHERE excluded_invoice."publicationId" = publication.id AND excluded_invoice."costCenterId" IS NULL)'
        );
        expect(queryBuilder.andWhere).not.toHaveBeenCalledWith('cost_center.id IS NOT NULL');
    });

    it('normalizes grouped statistics requests before delegating to the query builder', async () => {
        const publicationStatisticSpy = jest.spyOn(service, 'publication_statistic').mockResolvedValue([]);

        await service.getPublicationStatistic(
            2025,
            STATISTIC.COUNT,
            [GROUP.PUBLISHER],
            TIMEFRAME.CURRENT_YEAR,
            undefined,
            { publisherId: 5 } as any,
            { canReadNetCosts: true },
        );

        expect(publicationStatisticSpy).toHaveBeenCalledWith(
            2025,
            STATISTIC.COUNT,
            [],
            TIMEFRAME.CURRENT_YEAR,
            undefined,
            { publisherId: 5 }
        );
    });

    it('rejects statistic requests without a reporting year', async () => {
        expect(() => service.getPublicationStatistic(
            undefined as any,
            STATISTIC.COUNT,
            [],
            TIMEFRAME.CURRENT_YEAR,
        )).toThrow();
    });

    it('rejects net-cost statistics when the caller lacks read permission', async () => {
        expect(() => service.getPublicationStatistic(
            2025,
            STATISTIC.NET_COSTS,
            [],
            TIMEFRAME.CURRENT_YEAR,
            undefined,
            undefined,
            { canReadNetCosts: false },
        )).toThrow();
    });
});
