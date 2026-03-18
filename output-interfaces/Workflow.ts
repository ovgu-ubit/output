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
    last_run_status?: string;
    last_run_finished_at?: Date;
    last_run_report_id?: number;
    last_run_log_link?: string;
}

export interface ImportWorkflow extends Workflow {
    strategy_type?: ImportStrategy;
    strategy?: any;
}

export interface ExportWorkflow extends Workflow {
    strategy_type?: ExportStrategy;
    strategy?: ExportWorkflowStrategy;
}

export interface ExportWorkflowStrategy {
    format?: ExportFormat;
    disposition?: ExportDisposition;
    delimiter?: string;
    quote_char?: string;
    root_name?: string;
    sheet_name?: string;
    [key: string]: unknown;
}

export type ExportFormat = 'json' | 'xml' | 'csv' | 'xlsx';

export type ExportDisposition = 'inline' | 'attachment';

export interface WorkflowReport {
    id?: number;
    workflow?: ImportWorkflow;
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
    publication?: Publication;
    publicationId?: number;
    workflowReport?: WorkflowReport | null;
    workflowReportId?: number | null;
    timestamp?: Date;
    by_user?: string;
    patch_data?: unknown;
    dry_change?: boolean;
}

export interface ImportWorkflowTestResult {
    meta: {
        workflow_id: string;
        strategy_type: ImportStrategy;
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

export enum ImportStrategy {
    FILE_UPLOAD,
    URL_LOOKUP_AND_RETRIEVE,
    URL_QUERY_OFFSET,
    URL_DOI
}

export enum ExportStrategy {
    HTTP_RESPONSE
}

export enum WorkflowReportItemLevel {
    ERROR = 'error',
    WARNING = 'warning',
    INFO = 'info',
    DEBUG = 'debug',
}
