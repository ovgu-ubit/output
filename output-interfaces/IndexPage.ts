export type IndexSortDirection = 'asc' | 'desc';

export interface IndexSortCriterion<TColumn extends string = string> {
    key: TColumn;
    direction: IndexSortDirection;
}

export type IndexColumnFilters<TColumn extends string = string> = Partial<Record<TColumn, string>>;

/** Shared also by legacy endpoints with their own sorting syntax (e.g. invoices). */
export interface IndexPagingRequest {
    page?: number;
    page_size?: number;
    q?: string;
}

/** Common zero-based paging, searching and sorting contract for index endpoints. */
export interface IndexPageRequest<TColumn extends string = string> extends IndexPagingRequest {
    sort?: IndexSortCriterion<TColumn>[];
    column_filters?: IndexColumnFilters<TColumn>;
}

/** The year scopes aggregate values; it does not exclude master-data rows. */
export interface ReportingYearIndexPageRequest<TColumn extends string = string> extends IndexPageRequest<TColumn> {
    reporting_year?: number | null;
}

export interface IndexPage<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
}
