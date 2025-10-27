import { MigrationInterface, QueryRunner } from "typeorm";

export class ConfigType1761573293368 implements MigrationInterface {
    name = 'ConfigType1761573293368'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "config" ADD "type" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "config" DROP COLUMN "type"`);
    }

}
