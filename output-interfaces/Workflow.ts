export interface Workflow {
    id?: number;
    workflow_id?: number;
    label?: string;
    version?: number;
    created_at?: Date;
    modified_at?: Date;
    published_at?: Date;
    deleted_at?: Date;
    description?: string;
    mapping?: string;
}

export interface ImportWorkflow extends Workflow {
    strategy_type?: Strategy;
    strategy?: any;
}

export enum Strategy {
    FILE_CSV,
    FILE_XLSX,
    URL_QUERY_OFFSET,
    URL_DOI
}