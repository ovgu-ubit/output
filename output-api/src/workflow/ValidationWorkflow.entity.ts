import { Column, CreateDateColumn, DeleteDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { ValidationRule, ValidationTarget, ValidationWorkflow as IValidationWorkflow } from "../../../output-interfaces/Workflow";
import { SearchFilter } from "../../../output-interfaces/Config";
import { WorkflowReport } from "./WorkflowReport.entity";

@Entity("workflow_validation")
@Unique(["workflow_id", "version"])
export class ValidationWorkflow implements IValidationWorkflow {

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

    @Column({ nullable: true })
    mapping?: string;

    @Column({ nullable: true, type: 'timestamptz' })
    locked_at?: Date;

    @Column({ nullable: true })
    target?: ValidationTarget;

    @Column({ nullable: true, type: 'jsonb' })
    target_filter?: SearchFilter;

    @Column({ type: 'jsonb', array: true, default: () => 'ARRAY[]::jsonb[]' })
    rules?: ValidationRule[];

    @OneToMany(() => WorkflowReport, (report) => report.validationWorkflow)
    reports?: WorkflowReport[];
}
