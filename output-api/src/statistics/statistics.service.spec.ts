import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { StatisticsService } from './statistics.service';
import { Publication } from '../publication/core/Publication.entity';
import { InstituteService } from '../institute/institute.service';
import { STATISTIC, TIMEFRAME } from '../../../output-interfaces/Statistics';

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
            getRawMany: jest.fn().mockResolvedValue([]),
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
            expect.stringContaining('tmp.institute_id::integer[] && ARRAY[21,22]::integer[]'),
            'highlight'
        );
    });
});
