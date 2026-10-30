import { MigrationInterface, QueryRunner } from 'typeorm';

export class IndexPerformanceCriticalPaths1793358000000 implements MigrationInterface {
    name = 'IndexPerformanceCriticalPaths1793358000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_publication_pub_date" ON "publication" ("pub_date")`);
        await queryRunner.query(`CREATE INDEX "IDX_publication_pub_date_print_fallback" ON "publication" ("pub_date_print") WHERE "pub_date" IS NULL AND "pub_date_print" IS NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_publication_pub_date_accepted_fallback" ON "publication" ("pub_date_accepted") WHERE "pub_date" IS NULL AND "pub_date_accepted" IS NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_publication_pub_date_submitted_fallback" ON "publication" ("pub_date_submitted") WHERE "pub_date" IS NULL AND "pub_date_submitted" IS NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_publication_missing_dates" ON "publication" ("id") WHERE "pub_date" IS NULL AND "pub_date_print" IS NULL AND "pub_date_accepted" IS NULL AND "pub_date_submitted" IS NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_publication_deleted" ON "publication" ("delete_date") WHERE "delete_date" IS NOT NULL`);

        await queryRunner.query(`CREATE INDEX "IDX_author_publication_publication" ON "author_publication" ("publicationId")`);
        await queryRunner.query(`CREATE INDEX "IDX_author_publication_author_publication" ON "author_publication" ("authorId", "publicationId")`);
        await queryRunner.query(`CREATE INDEX "IDX_author_publication_institute_publication" ON "author_publication" ("instituteId", "publicationId")`);
        await queryRunner.query(`CREATE INDEX "IDX_author_publication_corresponding_publication" ON "author_publication" ("publicationId") WHERE "corresponding" IS TRUE`);

        await queryRunner.query(`CREATE INDEX "IDX_invoice_publication" ON "invoice" ("publicationId")`);
        await queryRunner.query(`CREATE INDEX "IDX_cost_item_invoice" ON "cost_item" ("invoiceId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_cost_item_invoice"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_invoice_publication"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_author_publication_corresponding_publication"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_author_publication_institute_publication"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_author_publication_author_publication"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_author_publication_publication"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_publication_deleted"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_publication_missing_dates"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_publication_pub_date_submitted_fallback"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_publication_pub_date_accepted_fallback"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_publication_pub_date_print_fallback"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_publication_pub_date"`);
    }
}
