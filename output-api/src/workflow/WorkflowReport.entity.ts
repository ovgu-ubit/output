import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { WorkflowReport as IWorkflowReport, WorkflowType } from "../../../output-interfaces/Workflow";
import { PublicationChange } from "../publication/core/PublicationChange.entity";
import { ExportWorkflow } from "./ExportWorkflow.entity";
import { ImportWorkflow } from "./ImportWorkflow.entity";
import { ValidationWorkflow } from "./ValidationWorkflow.entity";
import { WorkflowReportItem } from "./WorkflowReportItem.entity";

@Entity("workflow_report")
export class WorkflowReport implements IWorkflowReport {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column({ type: 'enum', enum: WorkflowType, default: WorkflowType.IMPORT })
    workflow_type?: WorkflowType;

    @ManyToOne(() => ImportWorkflow, (workflow) => workflow.reports, { nullable: true })
    @JoinColumn({ name: 'workflowId' })
    importWorkflow?: ImportWorkflow;

    @ManyToOne(() => ExportWorkflow, (workflow) => workflow.reports, { nullable: true })
    @JoinColumn({ name: 'exportWorkflowId' })
    exportWorkflow?: ExportWorkflow;

    @ManyToOne(() => ValidationWorkflow, (workflow) => workflow.reports, { nullable: true })
    @JoinColumn({ name: 'validationWorkflowId' })
    validationWorkflow?: ValidationWorkflow;

    workflow?: ImportWorkflow | ExportWorkflow | ValidationWorkflow;
    workflowId?: number;

    @Column({ type: 'jsonb' })
    params?: unknown;

    @Column({ nullable: true })
    by_user?: string;

    @Column({ nullable: true })
    status?: string;

    @Column({ type: 'double precision', default: 0 })
    progress?: number;

    @Column({ type: 'timestamptz' })
    started_at?: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at?: Date;

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
