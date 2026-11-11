import { MigrationInterface, QueryRunner } from 'typeorm';

export class PublicationTags1794220000000 implements MigrationInterface {
    name = 'PublicationTags1794220000000';

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "publication_tag" (
            "id" SERIAL NOT NULL PRIMARY KEY, "label" character varying NOT NULL,
            "description" text, "color" character varying)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_publication_tag_label" ON "publication_tag" (LOWER(BTRIM("label")))`);
        await queryRunner.query(`CREATE TABLE "publication_tag_assignment" (
            "publication_id" integer NOT NULL REFERENCES "publication"("id") ON DELETE CASCADE,
            "tag_id" integer NOT NULL REFERENCES "publication_tag"("id") ON DELETE RESTRICT,
            PRIMARY KEY ("publication_id", "tag_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_publication_tag_assignment_tag" ON "publication_tag_assignment" ("tag_id")`);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "publication_tag_assignment"`);
        await queryRunner.query(`DROP TABLE "publication_tag"`);
    }
}
