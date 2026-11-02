import { IndexPage, IndexPageRequest } from '@output/interfaces';
import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { createInvalidRequestHttpException } from './api-error';

export function validateIndexPageBounds(page: number, pageSize: number): void {
    if (!Number.isInteger(page) || page < 0 || page > 1000000) {
        throw createInvalidRequestHttpException('page must be an integer between 0 and 1000000.');
    }
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 200) {
        throw createInvalidRequestHttpException('page_size must be an integer between 1 and 200.');
    }
}

export function indexLikePattern(value: string): string {
    const trimmed = value.trim();
    const escaped = trimmed.replace(/[\\%_]/g, '\\$&');
    if (trimmed.includes('*') || trimmed.includes('?')) {
        const pattern = escaped.replace(/\*/g, '%').replace(/\?/g, '_');
        return pattern.endsWith('%') ? pattern : pattern + '%';
    }
    return `%${escaped}%`;
}

/** Page a trusted SQL projection, never an already materialized result array. */
export async function paginateIndexSql<T>(
    execute: (sql: string, parameters: unknown[]) => Promise<unknown>,
    sql: string,
    parameters: readonly unknown[],
    columns: readonly string[],
    request: IndexPageRequest,
): Promise<IndexPage<T>> {
    const page = request.page ?? 0;
    const pageSize = request.page_size ?? 10;
    validateIndexPageBounds(page, pageSize);
    const allowed = new Set(columns);
    const assertColumn = (column: string): void => {
        if (!allowed.has(column) || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) {
            throw createInvalidRequestHttpException(`Unsupported index column: ${column}`);
        }
    };
    columns.forEach(assertColumn);
    assertColumn('id');
    const values = [...parameters];
    const bind = (value: unknown): string => {
        values.push(value);
        return `$${values.length}`;
    };
    const textColumn = (column: string): string => `COALESCE(CAST(index_row."${column}" AS text), '')`;
    const predicates: string[] = [];
    if (request.q?.trim()) {
        const parameter = bind(indexLikePattern(request.q));
        predicates.push(`(${columns.map(column => `${textColumn(column)} ILIKE ${parameter} ESCAPE '\\'`).join(' OR ')})`);
    }
    for (const [column, value] of Object.entries(request.column_filters ?? {})) {
        assertColumn(column);
        if (typeof value !== 'string') throw createInvalidRequestHttpException(`Invalid filter value for index column: ${column}`);
        if (!value.trim()) continue;
        predicates.push(`${textColumn(column)} ILIKE ${bind(indexLikePattern(value))} ESCAPE '\\'`);
    }
    const order: string[] = [];
    const sorted = new Set<string>();
    for (const criterion of request.sort ?? []) {
        assertColumn(criterion.key);
        if (!['asc', 'desc'].includes(criterion.direction)) {
            throw createInvalidRequestHttpException(`Invalid sort direction for index column: ${criterion.key}`);
        }
        if (sorted.has(criterion.key)) continue;
        sorted.add(criterion.key);
        order.push(`index_row."${criterion.key}" ${criterion.direction === 'asc' ? 'ASC NULLS FIRST' : 'DESC NULLS LAST'}`);
    }
    if (!sorted.has('id')) order.push('index_row."id" ASC');
    const source = `FROM (${sql}) index_row${predicates.length ? ' WHERE ' + predicates.join(' AND ') : ''}`;
    const countParameters = [...values];
    const limit = bind(pageSize);
    const offset = bind(page * pageSize);
    const [items, count] = await Promise.all([
        execute(`SELECT index_row.* ${source} ORDER BY ${order.join(', ')} LIMIT ${limit} OFFSET ${offset}`, values) as Promise<T[]>,
        execute(`SELECT COUNT(*) AS total ${source}`, countParameters) as Promise<{ total: string }[]>,
    ]);
    return { items, total: Number(count[0]?.total ?? 0), page, page_size: pageSize };
}

export function paginateIndexQuery<T, E extends ObjectLiteral = ObjectLiteral>(
    query: SelectQueryBuilder<E>,
    request: IndexPageRequest,
): Promise<IndexPage<T>> {
    const [sql, parameters] = query.getQueryAndParameters();
    const columns = query.expressionMap.selects.map(select => select.aliasName).filter((column): column is string => !!column);
    return paginateIndexSql<T>((statement, values) => query.connection.query(statement, values), sql, parameters, columns, request);
}
