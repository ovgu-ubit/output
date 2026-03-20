import { MigrationInterface, QueryRunner } from "typeorm";

export class WorkflowReportProgress1773830000000 implements MigrationInterface {
    name = 'WorkflowReportProgress1773830000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workflow_report" ADD "progress" double precision NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workflow_report" DROP COLUMN "progress"`);
    }
}
