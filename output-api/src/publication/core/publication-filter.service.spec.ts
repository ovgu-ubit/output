import { AbstractFilterService, FilterService, SqlFilterService } from '../../workflow/filter/abstract-filter.service';
import { PublicationFilterService } from './publication-filter.service';

@FilterService({ path: 'sql-filter' })
class TestSqlFilter extends AbstractFilterService<any> implements SqlFilterService {
    async filter(values: any[]): Promise<any[]> { return values; }
    getName(): string { return 'SQL filter'; }
    getSqlPredicate(entityAlias: string): string { return `${entityAlias}.id > 0`; }
}

@FilterService({ path: 'memory-filter' })
class TestMemoryFilter extends AbstractFilterService<any> {
    async filter(values: any[]): Promise<any[]> { return values; }
    getName(): string { return 'Memory filter'; }
}

describe('PublicationFilterService', () => {
    it('applies registered SQL predicates before pagination', () => {
        const service = new PublicationFilterService([new TestSqlFilter()]);
        const query = { alias: 'publication', andWhere: jest.fn().mockReturnThis() };

        expect(service.applyPathsToQuery(query as any, ['sql-filter'])).toBe(query);
        expect(query.andWhere).toHaveBeenCalledWith('publication.id > 0');
    });

    it('rejects unknown and memory-only filters for paginated indexes', () => {
        const service = new PublicationFilterService([new TestMemoryFilter()]);
        const query = { alias: 'publication', andWhere: jest.fn().mockReturnThis() };

        expect(() => service.applyPathsToQuery(query as any, ['unknown'])).toThrow('Filter not found.');
        expect(() => service.applyPathsToQuery(query as any, ['memory-filter'])).toThrow('Filter is not available for paginated indexes.');
    });
});
