import { MigrationInterface, QueryRunner } from "typeorm";

export class Publication121741956016096 implements MigrationInterface {
    name = 'Publication121741956016096'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "publication" ADD "budget_relevant" boolean`);
        await queryRunner.query(`ALTER TABLE "publication" ADD "grant_number" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "publication" DROP COLUMN "grant_number"`);
        await queryRunner.query(`ALTER TABLE "publication" DROP COLUMN "budget_relevant"`);
    }

}
