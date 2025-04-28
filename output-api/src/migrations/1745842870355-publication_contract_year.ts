import { MigrationInterface, QueryRunner } from "typeorm";

export class PublicationContractYear1745842870355 implements MigrationInterface {
    name = 'PublicationContractYear1745842870355'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "publication" ADD "contract_year" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "publication" DROP COLUMN "contract_year"`);
    }

}
