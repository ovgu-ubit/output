import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn, VersionColumn } from "typeorm";
import { ImportWorkflow as IImportWorkflow, Strategy } from "../../../output-interfaces/Workflow";

@Entity("workflow_import")
@Unique(["workflow_id", "version"])
export class ImportWorkflow implements IImportWorkflow {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column({ type: "int" })
    workflow_id: number;

    @Column()
    label?: string;

    @VersionColumn()
    version?: number;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at?: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    modified_at?: Date;

    @Column({ nullable: true, type: 'timestamptz' })
    published_at?: Date;

    @DeleteDateColumn({ type: 'timestamptz' })
    deteted_at?: Date;

    @Column({ nullable: true })
    description?: string;

    @Column({ nullable: true, type: 'enum', enum: Strategy })
    strategy_type?: Strategy;

    @Column({ nullable: true, type: 'jsonb' })
    strategy?: unknown;

    @Column({ nullable: true})
    mapping?: string;
}
