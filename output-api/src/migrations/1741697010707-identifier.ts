import { MigrationInterface, QueryRunner } from "typeorm";

export class Identifier1741697010707 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "identifier" RENAME TO "ge_identifier"`,
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
        `ALTER TABLE "ge_identifier" RENAME TO "identifier"`,
    )
    }

}
