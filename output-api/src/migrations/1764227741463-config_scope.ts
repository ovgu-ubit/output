import { MigrationInterface, QueryRunner } from "typeorm";

export class ConfigScope1764227741463 implements MigrationInterface {
    name = 'ConfigScope1764227741463'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "config" ADD "scope" character varying NOT NULL DEFAULT 'admin'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "config" DROP COLUMN "scope"`);
    }

}
