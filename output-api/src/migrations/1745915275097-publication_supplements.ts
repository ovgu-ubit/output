import { MigrationInterface, QueryRunner } from "typeorm";

export class PublicationSupplements1745915275097 implements MigrationInterface {
    name = 'PublicationSupplements1745915275097'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "publication_supplement" ("id" SERIAL NOT NULL, "link" character varying NOT NULL, "publicationId" integer, CONSTRAINT "PK_b4fea07251df636176394f30fee" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "publication_supplement" ADD CONSTRAINT "FK_9f84c1d7d35e90b0f859934886b" FOREIGN KEY ("publicationId") REFERENCES "publication"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "publication_supplement" DROP CONSTRAINT "FK_9f84c1d7d35e90b0f859934886b"`);
        await queryRunner.query(`DROP TABLE "publication_supplement"`);
    }

}
