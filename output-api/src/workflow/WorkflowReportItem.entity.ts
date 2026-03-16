import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { WorkflowReportItem as IWorkflowReportItem, WorkflowReportItemLevel } from "../../../output-interfaces/Workflow";
import { WorkflowReport } from "./WorkflowReport.entity";

@Entity("workflow_report_item")
export class WorkflowReportItem implements IWorkflowReportItem {

    @PrimaryGeneratedColumn()
    id?: number;

    @ManyToOne(() => WorkflowReport, (workflowReport) => workflowReport.items, { onDelete: 'CASCADE' })
    workflowReport?: WorkflowReport;

    @Column({ type: 'timestamptz' })
    timestamp?: Date;

    @Column({ type: 'enum', enum: WorkflowReportItemLevel })
    level?: WorkflowReportItemLevel;

    @Column({ nullable: true })
    code?: string;

    @Column({ nullable: true })
    message?: string;
}
