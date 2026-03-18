import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { ExportStrategy, ExportWorkflow as IExportWorkflow, ExportWorkflowStrategy } from "../../../output-interfaces/Workflow";
import { WorkflowReport } from "./WorkflowReport.entity";
import { OneToMany } from "typeorm";

@Entity("workflow_export")
@Unique(["workflow_id", "version"])
export class ExportWorkflow implements IExportWorkflow {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    workflow_id?: string;

    @Column()
    label?: string;

    @Column({ type: 'int' })
    version?: number;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at?: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    modified_at?: Date;

    @Column({ nullable: true, type: 'timestamptz' })
    published_at?: Date;

    @DeleteDateColumn({ type: 'timestamptz' })
    deleted_at?: Date;

    @Column({ nullable: true })
    description?: string;

    @Column({ nullable: true, type: 'enum', enum: ExportStrategy })
    strategy_type?: ExportStrategy;

    @Column({ nullable: true, type: 'jsonb' })
    strategy?: ExportWorkflowStrategy;

    @Column({ nullable: true })
    mapping?: string;

    @Column({ nullable: true, type: 'timestamptz' })
    locked_at?: Date;

    @OneToMany(() => WorkflowReport, (report) => report.exportWorkflow)
    reports?: WorkflowReport[];
}
