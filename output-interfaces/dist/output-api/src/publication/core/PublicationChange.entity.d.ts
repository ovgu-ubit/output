import { PublicationChange as IPublicationChange } from '@output/interfaces';
import { WorkflowReport } from "../../workflow/WorkflowReport.entity";
import { Publication } from "./Publication.entity";
export declare class PublicationChange implements IPublicationChange {
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
