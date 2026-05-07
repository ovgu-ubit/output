import { WorkflowReport as IWorkflowReport, WorkflowType } from '@output/interfaces';
import { PublicationChange } from "../publication/core/PublicationChange.entity";
import { ExportWorkflow } from "./ExportWorkflow.entity";
import { ImportWorkflow } from "./ImportWorkflow.entity";
import { ValidationWorkflow } from "./ValidationWorkflow.entity";
import { WorkflowReportItem } from "./WorkflowReportItem.entity";
export declare class WorkflowReport implements IWorkflowReport {
    id?: number;
    workflow_type?: WorkflowType;
    importWorkflow?: ImportWorkflow;
    exportWorkflow?: ExportWorkflow;
    validationWorkflow?: ValidationWorkflow;
    workflow?: ImportWorkflow | ExportWorkflow | ValidationWorkflow;
    workflowId?: number;
    params?: unknown;
    by_user?: string;
    status?: string;
    progress?: number;
    started_at?: Date;
    updated_at?: Date;
    finished_at?: Date;
    summary?: unknown;
    dry_run?: boolean;
    items?: WorkflowReportItem[];
    publication_changes?: PublicationChange[];
}
