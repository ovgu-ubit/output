import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, RelationId } from "typeorm";
import { PublicationChange as IPublicationChange } from "../../../../output-interfaces/Workflow";
import { WorkflowReport } from "../../workflow/WorkflowReport.entity";
import { Publication } from "./Publication.entity";

@Entity("publication_change")
export class PublicationChange implements IPublicationChange {

    @PrimaryGeneratedColumn()
    id?: number;

    @ManyToOne(() => Publication, (publication) => publication.changes)
    publication?: Publication;

    @RelationId((change: PublicationChange) => change.publication)
    publicationId?: number;

    @ManyToOne(() => WorkflowReport, (workflowReport) => workflowReport.publication_changes, { nullable: true, onDelete: 'SET NULL' })
    workflowReport?: WorkflowReport | null;

    @RelationId((change: PublicationChange) => change.workflowReport)
    workflowReportId?: number | null;

    @Column({ type: 'timestamptz', nullable: true })
    timestamp?: Date;

    @Column({ nullable: true })
    by_user?: string;

    @Column({ type: 'jsonb' })
    patch_data?: unknown;

    @Column({ default: false })
    dry_change?: boolean;
}
