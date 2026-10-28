import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExportSourceEntity1793145600000 implements MigrationInterface {
    name = 'ExportSourceEntity1793145600000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workflow_export" ADD "source_entity" character varying NOT NULL DEFAULT 'publication'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workflow_export" DROP COLUMN "source_entity"`);
    }
}
