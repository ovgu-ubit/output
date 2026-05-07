import { ValidationRule, ValidationTarget, ValidationWorkflow as IValidationWorkflow } from '@output/interfaces';
import { SearchFilter } from '@output/interfaces';
import { WorkflowReport } from "./WorkflowReport.entity";
export declare class ValidationWorkflow implements IValidationWorkflow {
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
    target?: ValidationTarget;
    target_filter?: SearchFilter;
    rules?: ValidationRule[];
    reports?: WorkflowReport[];
}
