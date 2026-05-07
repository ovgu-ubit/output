import { ExportStrategy, ExportWorkflow as IExportWorkflow } from '@output/interfaces';
import { WorkflowReport } from "./WorkflowReport.entity";
export declare class ExportWorkflow implements IExportWorkflow {
    id?: number;
    workflow_id?: string;
    label?: string;
    version?: number;
    created_at?: Date;
    modified_at?: Date;
    published_at?: Date;
    deleted_at?: Date;
    description?: string;
    strategy_type?: ExportStrategy;
    strategy?: any;
    mapping?: string;
    locked_at?: Date;
    reports?: WorkflowReport[];
}
