import { MigrationInterface, QueryRunner } from "typeorm";

export class AuthorPublication1742283432450 implements MigrationInterface {
    name = 'AuthorPublication1742283432450'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "author_publication" ADD "id" SERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "author_publication" DROP CONSTRAINT "PK_8c4e30f98f07345579cf7444927"`);
        await queryRunner.query(`ALTER TABLE "author_publication" ADD CONSTRAINT "PK_db5dbed0066d802a0e476a0117b" PRIMARY KEY ("authorId", "publicationId", "id")`);
        await queryRunner.query(`ALTER TABLE "author_publication" DROP CONSTRAINT "FK_ef10c083d06b1cae0b227c93645"`);
        await queryRunner.query(`ALTER TABLE "author_publication" DROP CONSTRAINT "FK_371faad61f45930138c76d7f0fa"`);
        await queryRunner.query(`ALTER TABLE "author_publication" DROP CONSTRAINT "PK_db5dbed0066d802a0e476a0117b"`);
        await queryRunner.query(`ALTER TABLE "author_publication" ADD CONSTRAINT "PK_9d0c3290c042b923f1fc9ae9558" PRIMARY KEY ("publicationId", "id")`);
        await queryRunner.query(`ALTER TABLE "author_publication" DROP CONSTRAINT "PK_9d0c3290c042b923f1fc9ae9558"`);
        await queryRunner.query(`ALTER TABLE "author_publication" ADD CONSTRAINT "PK_2dc1474700cd37f68ead83b751d" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "author_publication" ADD CONSTRAINT "FK_ef10c083d06b1cae0b227c93645" FOREIGN KEY ("authorId") REFERENCES "author"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "author_publication" ADD CONSTRAINT "FK_371faad61f45930138c76d7f0fa" FOREIGN KEY ("publicationId") REFERENCES "publication"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "author_publication" DROP CONSTRAINT "FK_371faad61f45930138c76d7f0fa"`);
        await queryRunner.query(`ALTER TABLE "author_publication" DROP CONSTRAINT "FK_ef10c083d06b1cae0b227c93645"`);
        await queryRunner.query(`ALTER TABLE "author_publication" DROP CONSTRAINT "PK_2dc1474700cd37f68ead83b751d"`);
        await queryRunner.query(`ALTER TABLE "author_publication" ADD CONSTRAINT "PK_9d0c3290c042b923f1fc9ae9558" PRIMARY KEY ("publicationId", "id")`);
        await queryRunner.query(`ALTER TABLE "author_publication" DROP CONSTRAINT "PK_9d0c3290c042b923f1fc9ae9558"`);
        await queryRunner.query(`ALTER TABLE "author_publication" ADD CONSTRAINT "PK_db5dbed0066d802a0e476a0117b" PRIMARY KEY ("authorId", "publicationId", "id")`);
        await queryRunner.query(`ALTER TABLE "author_publication" ADD CONSTRAINT "FK_371faad61f45930138c76d7f0fa" FOREIGN KEY ("publicationId") REFERENCES "publication"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "author_publication" ADD CONSTRAINT "FK_ef10c083d06b1cae0b227c93645" FOREIGN KEY ("authorId") REFERENCES "author"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "author_publication" DROP CONSTRAINT "PK_db5dbed0066d802a0e476a0117b"`);
        await queryRunner.query(`ALTER TABLE "author_publication" ADD CONSTRAINT "PK_8c4e30f98f07345579cf7444927" PRIMARY KEY ("authorId", "publicationId")`);
        await queryRunner.query(`ALTER TABLE "author_publication" DROP COLUMN "id"`);
    }

}
