import { MigrationInterface, QueryRunner } from "typeorm";

export class WorkflowReport1773477322687 implements MigrationInterface {
    name = 'WorkflowReport1773477322687'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "publication_change" ("id" SERIAL NOT NULL, "timestamp" TIMESTAMP WITH TIME ZONE, "by_user" character varying, "patch_data" jsonb NOT NULL, "dry_change" boolean NOT NULL DEFAULT false, "publicationId" integer, "workflowReportId" integer, CONSTRAINT "PK_fadeaf97e32771590adc1ba9abb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "workflow_report" ("id" SERIAL NOT NULL, "params" jsonb NOT NULL, "by_user" character varying, "status" character varying, "started_at" TIMESTAMP WITH TIME ZONE NOT NULL, "finished_at" TIMESTAMP WITH TIME ZONE, "summary" jsonb, "dry_run" boolean NOT NULL DEFAULT false, "workflowId" integer, CONSTRAINT "PK_1e4320bb551efbb01b6fd75dc32" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."workflow_report_item_level_enum" AS ENUM('error', 'warning', 'info', 'debug')`);
        await queryRunner.query(`CREATE TABLE "workflow_report_item" ("id" SERIAL NOT NULL, "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, "level" "public"."workflow_report_item_level_enum" NOT NULL, "code" character varying, "message" character varying, "workflowReportId" integer, CONSTRAINT "PK_b0469f2cbef0d9bb4e3eb1e2012" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "publication_change" ADD CONSTRAINT "FK_3fa02eebded2bee3296561ec1e6" FOREIGN KEY ("publicationId") REFERENCES "publication"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "publication_change" ADD CONSTRAINT "FK_ffef7dc125667baee868792bc78" FOREIGN KEY ("workflowReportId") REFERENCES "workflow_report"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workflow_report" ADD CONSTRAINT "FK_e9dd1d4825302365d849fbe7a36" FOREIGN KEY ("workflowId") REFERENCES "workflow_import"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workflow_report_item" ADD CONSTRAINT "FK_dd2e45b831da4993ffc5fb82e2b" FOREIGN KEY ("workflowReportId") REFERENCES "workflow_report"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workflow_report_item" DROP CONSTRAINT "FK_dd2e45b831da4993ffc5fb82e2b"`);
        await queryRunner.query(`ALTER TABLE "workflow_report" DROP CONSTRAINT "FK_e9dd1d4825302365d849fbe7a36"`);
        await queryRunner.query(`ALTER TABLE "publication_change" DROP CONSTRAINT "FK_ffef7dc125667baee868792bc78"`);
        await queryRunner.query(`ALTER TABLE "publication_change" DROP CONSTRAINT "FK_3fa02eebded2bee3296561ec1e6"`);
        await queryRunner.query(`DROP TABLE "workflow_report_item"`);
        await queryRunner.query(`DROP TYPE "public"."workflow_report_item_level_enum"`);
        await queryRunner.query(`DROP TABLE "workflow_report"`);
        await queryRunner.query(`DROP TABLE "publication_change"`);
    }

}
