import { indexLikePattern, paginateIndexSql } from './index-page';

describe('SQL index pagination', () => {
    const columns = ['id', 'label', 'pub_count'];
    const sql = 'SELECT id, label, COUNT(*) AS pub_count FROM example WHERE year = $1 GROUP BY id, label';

    it('filters aggregated rows before counting and paging, preserving source parameters', async () => {
        const execute = jest.fn().mockResolvedValueOnce([{ id: 3, label: 'Alpha', pub_count: 12 }])
            .mockResolvedValueOnce([{ total: '8' }]);
        const result = await paginateIndexSql(execute, sql, [2026], columns, {
            page: 1, page_size: 5, q: 'Al', column_filters: { label: 'Alpha*' },
            sort: [{ key: 'pub_count', direction: 'desc' }],
        });

        const [pageSql, pageParameters] = execute.mock.calls[0];
        const [countSql, countParameters] = execute.mock.calls[1];
        expect(pageSql).toContain(`FROM (${sql}) index_row WHERE`);
        expect(pageSql).toContain('index_row."label" AS text');
        expect(pageSql).toContain('ORDER BY index_row."pub_count" DESC NULLS LAST, index_row."id" ASC LIMIT $4 OFFSET $5');
        expect(pageParameters).toEqual([2026, '%Al%', 'Alpha%', 5, 5]);
        expect(countParameters).toEqual([2026, '%Al%', 'Alpha%']);
        expect(countSql).toContain('SELECT COUNT(*) AS total');
        expect(countSql).not.toContain('LIMIT');
        expect(result).toEqual({ items: [{ id: 3, label: 'Alpha', pub_count: 12 }], total: 8, page: 1, page_size: 5 });
    });

    it.each([
        { page: -1 }, { page_size: 201 }, { page_size: 0 },
        { sort: [{ key: 'id; DROP TABLE example', direction: 'asc' }] },
        { sort: [{ key: 'label', direction: 'sideways' }] },
        { column_filters: { private_field: 'secret' } },
        { column_filters: { label: 3 } },
    ])('rejects invalid paging or projection access before executing SQL %#', async request => {
        const execute = jest.fn();
        await expect(paginateIndexSql(execute, sql, [], columns, request as never)).rejects.toMatchObject({ status: 400 });
        expect(execute).not.toHaveBeenCalled();
    });

    it('binds user input without interpolating it into SQL', async () => {
        const execute = jest.fn().mockResolvedValue([]);
        const q = "O'Reilly%_\\ OR 1=1";
        const result = await paginateIndexSql(execute, sql, [2026], columns, { q });
        expect(execute.mock.calls[0][0]).not.toContain(q);
        expect(execute.mock.calls[0][1][1]).toBe(indexLikePattern(q));
        expect(result.total).toBe(0);
    });

    it.each([
        ['Alpha', '%Alpha%'], ['Al*', 'Al%'], ['Al?ha', 'Al_ha%'],
        ['100%_\\', '%100\\%\\_\\\\%'],
    ])('keeps publication wildcard semantics for %s', (value, expected) => {
        expect(indexLikePattern(value)).toBe(expected);
    });
});
