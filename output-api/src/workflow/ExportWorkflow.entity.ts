import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { ExportEntityType, ExportStrategy, ExportWorkflow as IExportWorkflow } from '@output/interfaces';
import { WorkflowReport } from "./WorkflowReport.entity";
import { OneToMany } from "typeorm";
import { EXPORT_ENDPOINT_NAME_INDEX } from './export/export-endpoint-index';

@Entity("workflow_export")
@Unique(["workflow_id", "version"])
@Index(EXPORT_ENDPOINT_NAME_INDEX, { synchronize: false })
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

    @Column({ type: 'varchar', default: 'publication' })
    source_entity?: ExportEntityType;

    @Column({ nullable: true, type: 'enum', enum: ExportStrategy })
    strategy_type?: ExportStrategy;

    @Column({ nullable: true, type: 'jsonb' })
    strategy?: any;

    @Column({ nullable: true })
    mapping?: string;

    @Column({ nullable: true, type: 'timestamptz' })
    locked_at?: Date;

    @OneToMany(() => WorkflowReport, (report) => report.exportWorkflow)
    reports?: WorkflowReport[];
}
