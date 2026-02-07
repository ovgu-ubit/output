import { Publication } from "./Publication";

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
    locked_at?: Date;
}

export interface ImportWorkflow extends Workflow {
    strategy_type?: Strategy;
    strategy?: any;
}

export interface ImportWorkflowTestResult {
    meta: {
        workflow_id: number;
        strategy_type: Strategy;
        pos: number;
        strategy: any;
        timestamp: Date;
        durationMs: number;
    },
    read: {
        source: string;
        count: number;
        read_items: any[];
        response: any;
    },
    result: {
        status: 'ok' | 'warning' | 'error';
        issues: {message: string, error: any}[];
        imported: Publication[];
        update_fields : string[][];
        excluded: any[];
    }
}

export enum Strategy {
    FILE_UPLOAD,
    URL_LOOKUP_AND_RETRIEVE,
    URL_QUERY_OFFSET,
    URL_DOI
}