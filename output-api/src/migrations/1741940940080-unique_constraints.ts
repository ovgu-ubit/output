import { MigrationInterface, QueryRunner } from "typeorm";

export class UniqueConstraints1741940940080 implements MigrationInterface {
    name = 'UniqueConstraints1741940940080'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contract_identifier" DROP CONSTRAINT "UQ_33b0c2d6120e09f56151a1c828d"`);
        await queryRunner.query(`ALTER TABLE "identifier" DROP CONSTRAINT "UQ_5ef15c3a3d0ef645b63fd9dd6e6"`);
        await queryRunner.query(`ALTER TABLE "publication_identifier" DROP CONSTRAINT "UQ_22e7c341f21b8dcf92920f9916c"`);
        await queryRunner.query(`ALTER TABLE "author" DROP CONSTRAINT "UQ_764bfd174b4a5d08aaf805a8aad"`);
        await queryRunner.query(`ALTER TABLE "author" DROP CONSTRAINT "UQ_813b33e1ad0cc1f9d11b19cc4dc"`);
        await queryRunner.query(`ALTER TABLE "funder" DROP CONSTRAINT "UQ_707a20eab8d600e0ace1c86a892"`);
        await queryRunner.query(`ALTER TABLE "funder" DROP CONSTRAINT "UQ_c820ddd7dc2c5613b65fdfbc85a"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "publication_identifier" ADD CONSTRAINT "UQ_22e7c341f21b8dcf92920f9916c" UNIQUE ("type", "value")`);
        await queryRunner.query(`ALTER TABLE "identifier" ADD CONSTRAINT "UQ_5ef15c3a3d0ef645b63fd9dd6e6" UNIQUE ("type", "value")`);
        await queryRunner.query(`ALTER TABLE "contract_identifier" ADD CONSTRAINT "UQ_33b0c2d6120e09f56151a1c828d" UNIQUE ("type", "value")`);
        await queryRunner.query(`ALTER TABLE "author" ADD CONSTRAINT "UQ_764bfd174b4a5d08aaf805a8aad" UNIQUE ("gnd_id")`);
        await queryRunner.query(`ALTER TABLE "author" ADD CONSTRAINT "UQ_813b33e1ad0cc1f9d11b19cc4dc" UNIQUE ("orcid")`);
        await queryRunner.query(`ALTER TABLE "funder" ADD CONSTRAINT "UQ_707a20eab8d600e0ace1c86a892" UNIQUE ("doi")`);
        await queryRunner.query(`ALTER TABLE "funder" ADD CONSTRAINT "UQ_c820ddd7dc2c5613b65fdfbc85a" UNIQUE ("ror_id")`);
    }

}
