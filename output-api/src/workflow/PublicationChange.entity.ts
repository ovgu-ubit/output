import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { PublicationChange as IPublicationChange } from "../../../output-interfaces/Workflow";
import { Publication } from "../publication/core/Publication.entity";
import { WorkflowReport } from "./WorkflowReport.entity";

@Entity("publication_change")
export class PublicationChange implements IPublicationChange {

    @PrimaryGeneratedColumn()
    id?: number;

    @ManyToOne(() => Publication, (publication) => publication.changes)
    publication?: Publication;

    @ManyToOne(() => WorkflowReport, (workflowReport) => workflowReport.publication_changes, { nullable: true, onDelete: 'SET NULL' })
    workflowReport?: WorkflowReport | null;

    @Column({ type: 'timestamptz', nullable: true })
    timestamp?: Date;

    @Column({ nullable: true })
    by_user?: string;

    @Column({ type: 'jsonb' })
    patch_data?: unknown;

    @Column({ default: false })
    dry_change?: boolean;
}
