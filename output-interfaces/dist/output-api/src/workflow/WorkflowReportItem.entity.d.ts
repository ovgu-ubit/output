import { WorkflowReportItem as IWorkflowReportItem, WorkflowReportItemLevel } from '@output/interfaces';
import { WorkflowReport } from "./WorkflowReport.entity";
export declare class WorkflowReportItem implements IWorkflowReportItem {
    id?: number;
    workflowReport?: WorkflowReport;
    timestamp?: Date;
    level?: WorkflowReportItemLevel;
    code?: string;
    message?: string;
}
