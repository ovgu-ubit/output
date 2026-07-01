import { MigrationInterface, QueryRunner } from "typeorm";

export class AuthorInternalRemark1782864000000 implements MigrationInterface {
    name = 'AuthorInternalRemark1782864000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "author" ADD "internal_remark" character varying DEFAULT ''`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "author" DROP COLUMN "internal_remark"`);
    }
}
