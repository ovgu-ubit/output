import { MigrationInterface, QueryRunner } from "typeorm";

export class ConfigUnique1761805119483 implements MigrationInterface {
    name = 'ConfigUnique1761805119483'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "config" ADD CONSTRAINT "UQ_26489c99ddbb4c91631ef5cc791" UNIQUE ("key")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "config" DROP CONSTRAINT "UQ_26489c99ddbb4c91631ef5cc791"`);
    }

}
