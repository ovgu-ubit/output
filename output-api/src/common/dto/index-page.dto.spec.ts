import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ReportingYearIndexPageRequestDto } from './index-page.dto';

describe('ReportingYearIndexPageRequestDto', () => {
    it('preserves undated scope and validates inherited paging and sorting fields', async () => {
        const request = plainToInstance(ReportingYearIndexPageRequestDto, {
            page: '2', page_size: '20', reporting_year: null,
            sort: [{ key: 'pub_count', direction: 'desc' }], column_filters: { label: 'Test' },
        });
        expect(await validate(request)).toEqual([]);
        expect(request).toMatchObject({ page: 2, page_size: 20, reporting_year: null });
    });

    it.each([
        { reporting_year: 0 }, { reporting_year: 'invalid' }, { reporting_year: 10000 },
        { sort: [{ key: 'id', direction: 'invalid' }] }, { page_size: 201 },
        { q: 'x'.repeat(501) }, { column_filters: [] },
    ])('rejects malformed page requests %#', async value => {
        expect(await validate(plainToInstance(ReportingYearIndexPageRequestDto, value))).not.toEqual([]);
    });
});
