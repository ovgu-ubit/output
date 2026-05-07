export interface Config {
    key: string;
    description?: string;
    value: any;
    scope?: 'public' | 'user' | 'admin';
}
export declare class AppError {
    origin: string;
    text: string;
}
export interface HealthState {
    status: "ok" | "error";
    timestamp: string;
    uptime: number;
    checks: {
        database: "up" | "down";
    };
}
export declare class UpdateMapping {
    author_inst: UpdateOptions;
    authors: UpdateOptions;
    title: UpdateOptions;
    pub_type: UpdateOptions;
    oa_category: UpdateOptions;
    greater_entity: UpdateOptions;
    publisher: UpdateOptions;
    contract: UpdateOptions;
    funder: UpdateOptions;
    doi: UpdateOptions;
    pub_date: UpdateOptions;
    link: UpdateOptions;
    language: UpdateOptions;
    license: UpdateOptions;
    invoice: UpdateOptions;
    status: UpdateOptions;
    abstract: UpdateOptions;
    citation: UpdateOptions;
    page_count: UpdateOptions;
    peer_reviewed: UpdateOptions;
    cost_approach: UpdateOptions;
}
export declare enum UpdateOptions {
    IGNORE = 0,
    REPLACE = 1,
    REPLACE_IF_EMPTY = 2,
    APPEND = 3
}
export declare class CSVMapping {
    name: string;
    encoding: string;
    header: boolean;
    quotes: boolean;
    delimiter: string;
    quoteChar?: string;
    date_format?: string;
    id_ge_type?: string;
    last_name_first: boolean;
    split_authors?: string;
    deal_flat_fee?: boolean;
    mapping: {
        author_inst?: string;
        authors?: string;
        title?: string;
        pub_type?: string;
        oa_category?: string;
        greater_entity?: string;
        id_ge?: string;
        publisher?: string;
        contract?: string;
        funder?: string;
        doi?: string;
        pub_date?: string;
        pub_date_print?: string;
        pub_date_accepted?: string;
        pub_date_submitted?: string;
        link?: string;
        language?: string;
        license?: string;
        invoice?: string;
        status?: string;
        abstract?: string;
        volume?: string;
        issue?: string;
        first_page?: string;
        last_page?: string;
        page_count?: string;
        peer_reviewed?: string;
        publisher_location?: string;
        edition?: string;
        article_number?: string;
        cost_approach?: string;
        cost_approach_currency?: string;
    };
}
export declare class SearchFilter {
    expressions: SearchFilterExpression[];
}
export type SearchFilterValue = string | number | boolean | null | Array<string | number | boolean>;
export declare class SearchFilterExpression {
    op: JoinOperation;
    key: string;
    comp: CompareOperation;
    value: SearchFilterValue;
}
export declare enum CompareOperation {
    INCLUDES = 0,
    EQUALS = 1,
    STARTS_WITH = 2,
    GREATER_THAN = 3,
    SMALLER_THAN = 4,
    IN = 5
}
export declare enum JoinOperation {
    AND = 0,
    OR = 1,
    AND_NOT = 2
}
