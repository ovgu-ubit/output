import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { WorkflowReport as IWorkflowReport } from "../../../output-interfaces/Workflow";
import { ImportWorkflow } from "./ImportWorkflow.entity";
import { PublicationChange } from "./PublicationChange.entity";
import { WorkflowReportItem } from "./WorkflowReportItem.entity";

@Entity("workflow_report")
export class WorkflowReport implements IWorkflowReport {

    @PrimaryGeneratedColumn()
    id?: number;

    @ManyToOne(() => ImportWorkflow, (workflow) => workflow.reports)
    workflow?: ImportWorkflow;

    @Column({ type: 'jsonb' })
    params?: unknown;

    @Column({ nullable: true })
    by_user?: string;

    @Column({ nullable: true })
    status?: string;

    @Column({ type: 'timestamptz' })
    started_at?: Date;

    @Column({ nullable: true, type: 'timestamptz' })
    finished_at?: Date;

    @Column({ nullable: true, type: 'jsonb' })
    summary?: unknown;

    @Column({ default: false })
    dry_run?: boolean;

    @OneToMany(() => WorkflowReportItem, (item) => item.workflowReport, { cascade: true })
    items?: WorkflowReportItem[];

    @OneToMany(() => PublicationChange, (change) => change.workflowReport)
    publication_changes?: PublicationChange[];
}
