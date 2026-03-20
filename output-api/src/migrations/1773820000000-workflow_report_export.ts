import { MigrationInterface, QueryRunner } from "typeorm";

export class WorkflowReportExport1773820000000 implements MigrationInterface {
    name = 'WorkflowReportExport1773820000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."workflow_report_workflow_type_enum" AS ENUM('import', 'export')`);
        await queryRunner.query(`ALTER TABLE "workflow_report" ADD "workflow_type" "public"."workflow_report_workflow_type_enum" NOT NULL DEFAULT 'import'`);
        await queryRunner.query(`ALTER TABLE "workflow_report" ADD "exportWorkflowId" integer`);
        await queryRunner.query(`ALTER TABLE "workflow_report" ADD CONSTRAINT "FK_0af27e46b6b09f40f9c3af10f91" FOREIGN KEY ("exportWorkflowId") REFERENCES "workflow_export"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workflow_report" DROP CONSTRAINT "FK_0af27e46b6b09f40f9c3af10f91"`);
        await queryRunner.query(`ALTER TABLE "workflow_report" DROP COLUMN "exportWorkflowId"`);
        await queryRunner.query(`ALTER TABLE "workflow_report" DROP COLUMN "workflow_type"`);
        await queryRunner.query(`DROP TYPE "public"."workflow_report_workflow_type_enum"`);
    }
}
