import { Publication } from "./Publication";

export interface Workflow {
    id?: number;
    workflow_id?: string;
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

export interface WorkflowReport {
    id?: number;
    workflowId?: number;
    params?: unknown;
    by_user?: string;
    status?: string;
    started_at?: Date;
    finished_at?: Date;
    summary?: unknown;
    dry_run?: boolean;
    items?: WorkflowReportItem[];
    publication_changes?: PublicationChange[];
}

export interface WorkflowReportItem {
    id?: number;
    workflowReportId?: number;
    timestamp?: Date;
    level?: WorkflowReportItemLevel;
    code?: string;
    message?: string;
}

export interface PublicationChange {
    id?: number;
    publicationId?: number;
    workflowReportId?: number | null;
    timestamp?: Date;
    by_user?: string;
    patch_data?: unknown;
    dry_change?: boolean;
}

export interface ImportWorkflowTestResult {
    meta: {
        workflow_id: string;
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

export enum WorkflowReportItemLevel {
    ERROR = 'error',
    WARNING = 'warning',
    INFO = 'info',
    DEBUG = 'debug',
}
