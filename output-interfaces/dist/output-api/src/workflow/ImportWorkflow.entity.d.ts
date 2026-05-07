import { UpdateMapping } from '@output/interfaces';
import { ImportWorkflow as IImportWorkflow, ImportStrategy } from '@output/interfaces';
import { WorkflowReport } from "./WorkflowReport.entity";
export declare class ImportWorkflow implements IImportWorkflow {
    id?: number;
    workflow_id?: string;
    label?: string;
    version?: number;
    created_at?: Date;
    modified_at?: Date;
    published_at?: Date;
    deleted_at?: Date;
    description?: string;
    strategy_type?: ImportStrategy;
    strategy?: unknown;
    mapping?: string;
    update_config?: UpdateMapping;
    locked_at?: Date;
    reports?: WorkflowReport[];
}
