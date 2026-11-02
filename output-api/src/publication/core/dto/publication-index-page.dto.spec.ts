import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PublicationIndexPageRequestDto } from './publication-index-page.dto';

describe('PublicationIndexPageRequestDto', () => {
    it('provides reusable paging defaults', async () => {
        const dto = plainToInstance(PublicationIndexPageRequestDto, {});

        await expect(validate(dto)).resolves.toEqual([]);
        expect(dto).toMatchObject({
            page: 0,
            page_size: 10,
            sort: [],
            paths: [],
            all_reporting_years: false,
            soft: false,
        });
    });

    it('transforms and validates a paginated publication request', async () => {
        const dto = plainToInstance(PublicationIndexPageRequestDto, {
            page: '2',
            page_size: '20',
            reporting_year: '2026',
            sort: [{ key: 'title', direction: 'asc' }],
            column_filters: { status: '1' },
            paths: ['missing-inst_auth'],
        });

        await expect(validate(dto)).resolves.toEqual([]);
        expect(dto.page).toBe(2);
        expect(dto.page_size).toBe(20);
        expect(dto.reporting_year).toBe(2026);
    });

    it('preserves null as the undated-publications scope', async () => {
        const dto = plainToInstance(PublicationIndexPageRequestDto, { reporting_year: null });

        await expect(validate(dto)).resolves.toEqual([]);
        expect(dto.reporting_year).toBeNull();
    });

    it.each([
        { page: -1 },
        { page_size: 0 },
        { page_size: 201 },
        { reporting_year: 0 },
        { sort: [{ key: 'title', direction: 'sideways' }] },
        { paths: [1] },
    ])('rejects invalid paging input %#', async (value) => {
        const dto = plainToInstance(PublicationIndexPageRequestDto, value);
        expect(await validate(dto)).not.toEqual([]);
    });
});
