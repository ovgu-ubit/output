import { MigrationInterface, QueryRunner } from "typeorm";

export class BudgetRelevant1770971736160 implements MigrationInterface {
    name = 'BudgetRelevant1770971736160'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "publication" RENAME COLUMN "budget_relevant" TO "not_budget_relevant"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "publication" RENAME COLUMN "not_budget_relevant" TO "budget_relevant"`);
    }

}
