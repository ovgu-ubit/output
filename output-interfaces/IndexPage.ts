export type IndexSortDirection = 'asc' | 'desc';

export interface IndexSortCriterion<TColumn extends string = string> {
    key: TColumn;
    direction: IndexSortDirection;
}

export type IndexColumnFilters<TColumn extends string = string> = Partial<Record<TColumn, string>>;

/** Common zero-based paging, searching and sorting contract for index endpoints. */
export interface IndexPageRequest<TColumn extends string = string> {
    page?: number;
    page_size?: number;
    sort?: IndexSortCriterion<TColumn>[];
    q?: string;
    column_filters?: IndexColumnFilters<TColumn>;
}

export interface IndexPage<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
}
