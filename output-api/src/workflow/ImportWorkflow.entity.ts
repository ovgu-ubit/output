import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { UpdateMapping } from "../../../output-interfaces/Config";
import { ImportWorkflow as IImportWorkflow, Strategy } from "../../../output-interfaces/Workflow";

@Entity("workflow_import")
@Unique(["workflow_id", "version"])
export class ImportWorkflow implements IImportWorkflow {

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

    @Column({ nullable: true, type: 'enum', enum: Strategy })
    strategy_type?: Strategy;

    @Column({ nullable: true, type: 'jsonb' })
    strategy?: unknown;

    @Column({ nullable: true })
    mapping?: string;

    @Column({ nullable: true, type: 'jsonb' })
    update_config?: UpdateMapping

    @Column({ nullable: true, type: 'timestamptz' })
    locked_at?: Date;
}
