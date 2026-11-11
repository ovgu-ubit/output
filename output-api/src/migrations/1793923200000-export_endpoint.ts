import { MigrationInterface, QueryRunner } from 'typeorm';
import { CREATE_EXPORT_ENDPOINT_NAME_INDEX, EXPORT_ENDPOINT_NAME_INDEX } from '../workflow/export/export-endpoint-index';

export class ExportEndpoint1793923200000 implements MigrationInterface {
    name = 'ExportEndpoint1793923200000';

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."workflow_export_strategy_type_enum" ADD VALUE IF NOT EXISTS '1'`);
        await queryRunner.query(CREATE_EXPORT_ENDPOINT_NAME_INDEX);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        const rows: { exists: boolean }[] = await queryRunner.query(
            `SELECT EXISTS (SELECT 1 FROM "workflow_export" WHERE "strategy_type"::text = '1') AS "exists"`,
        );
        if (rows[0]?.exists) throw new Error('Cannot remove endpoint strategy while endpoint workflows exist.');

        await queryRunner.query(`DROP INDEX "public"."${EXPORT_ENDPOINT_NAME_INDEX}"`);
        await queryRunner.query(`ALTER TYPE "public"."workflow_export_strategy_type_enum" RENAME TO "workflow_export_strategy_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."workflow_export_strategy_type_enum" AS ENUM('0')`);
        await queryRunner.query(`ALTER TABLE "workflow_export" ALTER COLUMN "strategy_type" TYPE "public"."workflow_export_strategy_type_enum" USING "strategy_type"::text::"public"."workflow_export_strategy_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."workflow_export_strategy_type_enum_old"`);
    }
}
