import { MigrationInterface, QueryRunner } from "typeorm";

export class InstituteOpusId1745828875034 implements MigrationInterface {
    name = 'InstituteOpusId1745828875034'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "institute" ADD "opus_id" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "institute" DROP COLUMN "opus_id"`);
    }

}
