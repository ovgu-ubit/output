import { MigrationInterface, QueryRunner } from "typeorm";

export class PublicationCostApproachCurrency1772809200000 implements MigrationInterface {
    name = 'PublicationCostApproachCurrency1772809200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "publication" ADD "cost_approach_currency" character varying NOT NULL DEFAULT 'EUR'`);
        await queryRunner.query(`UPDATE "publication" SET "cost_approach_currency" = 'EUR' WHERE "cost_approach_currency" IS NULL OR "cost_approach_currency" = ''`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "publication" DROP COLUMN "cost_approach_currency"`);
    }
}
