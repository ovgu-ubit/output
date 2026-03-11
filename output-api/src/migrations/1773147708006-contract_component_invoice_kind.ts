import { MigrationInterface, QueryRunner } from "typeorm";

export class ContractComponentInvoiceKind1773147708006 implements MigrationInterface {
    name = 'ContractComponentInvoiceKind1773147708006'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."invoice_invoice_kind_enum" AS ENUM('invoice', 'pre_invoice')`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "invoice_kind" "public"."invoice_invoice_kind_enum" NOT NULL DEFAULT 'invoice'`);
        await queryRunner.query(`UPDATE "invoice" SET "invoice_kind" = 'invoice' WHERE "contractComponentId" IS NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "invoice_kind"`);
        await queryRunner.query(`DROP TYPE "public"."invoice_invoice_kind_enum"`);
    }
}
