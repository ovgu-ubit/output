import { MigrationInterface, QueryRunner } from "typeorm";

export class ImportWorkflow1769081242941 implements MigrationInterface {
    name = 'ImportWorkflow1769081242941'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."workflow_import_strategy_type_enum" AS ENUM('0', '1', '2', '3')`);
        await queryRunner.query(`CREATE TABLE "workflow_import" ("id" SERIAL NOT NULL, "workflow_id" integer NOT NULL, "label" character varying NOT NULL, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "modified_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "published_at" TIMESTAMP WITH TIME ZONE, "deleted_at" TIMESTAMP WITH TIME ZONE, "description" character varying, "strategy_type" "public"."workflow_import_strategy_type_enum", "strategy" jsonb, "mapping" character varying, "update_config" jsonb, "locked_at" TIMESTAMP WITH TIME ZONE CONSTRAINT "UQ_df41b3a5cdc3da7b056c9023304" UNIQUE ("workflow_id", "version"), CONSTRAINT "PK_4341ef4b7746690ac61dc9f536d" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "workflow_import"`);
        await queryRunner.query(`DROP TYPE "public"."workflow_import_strategy_type_enum"`);
    }

}
