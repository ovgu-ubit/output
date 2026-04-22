import { MigrationInterface, QueryRunner } from "typeorm";

export class WorkflowReportValidation1775030500000 implements MigrationInterface {
    name = 'WorkflowReportValidation1775030500000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."workflow_report_workflow_type_enum" ADD VALUE IF NOT EXISTS 'validation'`);
        await queryRunner.query(`ALTER TABLE "workflow_report" ADD "validationWorkflowId" integer`);
        await queryRunner.query(`ALTER TABLE "workflow_report" ADD CONSTRAINT "FK_4268031d8688b5d4c0526483d8f" FOREIGN KEY ("validationWorkflowId") REFERENCES "workflow_validation"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workflow_report" DROP CONSTRAINT "FK_4268031d8688b5d4c0526483d8f"`);
        await queryRunner.query(`ALTER TABLE "workflow_report" DROP COLUMN "validationWorkflowId"`);
        await queryRunner.query(`DELETE FROM "workflow_report" WHERE "workflow_type" = 'validation'`);
        await queryRunner.query(`ALTER TYPE "public"."workflow_report_workflow_type_enum" RENAME TO "workflow_report_workflow_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."workflow_report_workflow_type_enum" AS ENUM('import', 'export')`);
        await queryRunner.query(`ALTER TABLE "workflow_report" ALTER COLUMN "workflow_type" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "workflow_report" ALTER COLUMN "workflow_type" TYPE "public"."workflow_report_workflow_type_enum" USING ("workflow_type"::text::"public"."workflow_report_workflow_type_enum")`);
        await queryRunner.query(`ALTER TABLE "workflow_report" ALTER COLUMN "workflow_type" SET DEFAULT 'import'`);
        await queryRunner.query(`DROP TYPE "public"."workflow_report_workflow_type_enum_old"`);
    }
}
