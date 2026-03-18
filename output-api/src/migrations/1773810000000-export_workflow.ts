import { MigrationInterface, QueryRunner } from "typeorm";

export class ExportWorkflow1773810000000 implements MigrationInterface {
    name = 'ExportWorkflow1773810000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."workflow_export_strategy_type_enum" AS ENUM('1')`);
        await queryRunner.query(`CREATE TABLE "workflow_export" ("id" SERIAL NOT NULL, "workflow_id" character varying NOT NULL, "label" character varying NOT NULL, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "modified_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "published_at" TIMESTAMP WITH TIME ZONE, "deleted_at" TIMESTAMP WITH TIME ZONE, "description" character varying, "strategy_type" "public"."workflow_export_strategy_type_enum", "strategy" jsonb, "mapping" character varying, "locked_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_f2c20cf5083cc64706a4d1d85f1" UNIQUE ("workflow_id", "version"), CONSTRAINT "PK_9dc5d9044bd63af5b9e2f01374a" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "workflow_export"`);
        await queryRunner.query(`DROP TYPE "public"."workflow_export_strategy_type_enum"`);
    }
}
