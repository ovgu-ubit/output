import { MigrationInterface, QueryRunner } from "typeorm";

export class ConfigKey1761566020913 implements MigrationInterface {
    name = 'ConfigKey1761566020913'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "config" ADD "id" SERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "config" DROP CONSTRAINT "PK_26489c99ddbb4c91631ef5cc791"`);
        await queryRunner.query(`ALTER TABLE "config" ADD CONSTRAINT "PK_5a05a10a6977187811aee5f26bc" PRIMARY KEY ("key", "id")`);
        await queryRunner.query(`ALTER TABLE "config" DROP CONSTRAINT "PK_5a05a10a6977187811aee5f26bc"`);
        await queryRunner.query(`ALTER TABLE "config" ADD CONSTRAINT "PK_d0ee79a681413d50b0a4f98cf7b" PRIMARY KEY ("id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "config" DROP CONSTRAINT "PK_d0ee79a681413d50b0a4f98cf7b"`);
        await queryRunner.query(`ALTER TABLE "config" ADD CONSTRAINT "PK_5a05a10a6977187811aee5f26bc" PRIMARY KEY ("key", "id")`);
        await queryRunner.query(`ALTER TABLE "config" DROP CONSTRAINT "PK_5a05a10a6977187811aee5f26bc"`);
        await queryRunner.query(`ALTER TABLE "config" ADD CONSTRAINT "PK_26489c99ddbb4c91631ef5cc791" PRIMARY KEY ("key")`);
        await queryRunner.query(`ALTER TABLE "config" DROP COLUMN "id"`);
    }

}
