export interface Config {
    key:string;
	value:string;
}

export class AppError {
    origin: string;
    text: string;
}

export class UpdateMapping {
    author_inst: UpdateOptions = UpdateOptions.APPEND;
    authors: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    title: UpdateOptions = UpdateOptions.IGNORE;
    pub_type: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    oa_category: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    greater_entity: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    publisher: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    contract: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    funder: UpdateOptions = UpdateOptions.APPEND;
    doi: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    pub_date: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    link: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    language: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    license: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    invoice: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    status: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
}

export enum UpdateOptions {
    IGNORE,
    REPLACE,
    REPLACE_IF_EMPTY,
    APPEND
}

export class CSVMapping {
    name: string;
    encoding: string;
    header: boolean;
    quotes: boolean;
    delimiter: string;
    quoteChar?: string;
    date_format?: string;
    id_ge_type?: string;
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
        link?: string;
        language?: string;
        license?: string;
        invoice?: string;
        status?: string;
    }
}

export class SearchFilter {
    expressions: SearchFilterExpression[];
}

export class SearchFilterExpression {
    op: JoinOperation;
    key: string;
    comp: CompareOperation;
    value: string|number;
}

export enum CompareOperation {
    INCLUDES,
    EQUALS,
    STARTS_WITH,
    GREATER_THAN,
    SMALLER_THAN
}

export enum JoinOperation {
    AND,
    OR,
    AND_NOT
}
