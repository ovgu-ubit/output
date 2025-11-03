import { MigrationInterface, QueryRunner } from "typeorm";

export class ConfigDesc1762169637185 implements MigrationInterface {
    name = 'ConfigDesc1762169637185'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "config" ADD "description" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "config" DROP COLUMN "description"`);
    }

}
