import { MigrationInterface, QueryRunner } from "typeorm";

export class PublicationDuplicate1747033575846 implements MigrationInterface {
    name = 'PublicationDuplicate1747033575846'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "publication_duplicate" ("id" SERIAL NOT NULL, "id_first" integer NOT NULL, "id_second" integer NOT NULL, "description" character varying NOT NULL, "delete_date" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_dc2b8ba7a494b2fef2621a35e87" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "publication_duplicate" ADD CONSTRAINT "FK_c7802f5cf058f92d5e29f824712" FOREIGN KEY ("id_first") REFERENCES "publication"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "publication_duplicate" DROP CONSTRAINT "FK_c7802f5cf058f92d5e29f824712"`);
        await queryRunner.query(`DROP TABLE "publication_duplicate"`);
    }

}
