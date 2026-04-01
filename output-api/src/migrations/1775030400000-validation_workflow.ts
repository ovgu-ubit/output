import { MigrationInterface, QueryRunner } from "typeorm";

export class ValidationWorkflow1775030400000 implements MigrationInterface {
    name = 'ValidationWorkflow1775030400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "workflow_validation" ("id" SERIAL NOT NULL, "workflow_id" character varying NOT NULL, "label" character varying NOT NULL, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "modified_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "published_at" TIMESTAMP WITH TIME ZONE, "deleted_at" TIMESTAMP WITH TIME ZONE, "description" character varying, "mapping" character varying, "locked_at" TIMESTAMP WITH TIME ZONE, "target" character varying, "target_filter" jsonb, "rules" jsonb NOT NULL DEFAULT '[]'::jsonb, CONSTRAINT "UQ_623b33a3ab761895b0904a38d16" UNIQUE ("workflow_id", "version"), CONSTRAINT "PK_dc353d025ec321876324d8edcb8" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "workflow_validation"`);
    }
}
