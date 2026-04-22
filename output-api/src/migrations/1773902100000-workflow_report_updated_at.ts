import { MigrationInterface, QueryRunner } from "typeorm";

export class WorkflowReportUpdatedAt1773902100000 implements MigrationInterface {
    name = 'WorkflowReportUpdatedAt1773902100000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workflow_report" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workflow_report" DROP COLUMN "updated_at"`);
    }
}
