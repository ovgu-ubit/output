import { MigrationInterface, QueryRunner } from "typeorm";

export class ContractComponent1773147708005 implements MigrationInterface {
    name = 'ContractComponent1773147708005'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workflow_import" DROP CONSTRAINT "UQ_df41b3a5cdc3da7b056c9023304"`);
        await queryRunner.query(`CREATE TYPE "public"."contract_component_contract_model_enum" AS ENUM('0', '1', '2')`);
        await queryRunner.query(`CREATE TABLE "contract_component" ("id" SERIAL NOT NULL, "label" character varying NOT NULL, "contract_model" "public"."contract_component_contract_model_enum", "contract_model_version" integer, "contract_model_params" jsonb, "contractId" integer, CONSTRAINT "PK_a38fa220281e2599e46a9c7c4e0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "contract_component_oa_categories_oa_category" ("contractComponentId" integer NOT NULL, "oaCategoryId" integer NOT NULL, CONSTRAINT "PK_c7344d532bb591a097534b2ca8b" PRIMARY KEY ("contractComponentId", "oaCategoryId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b7bef2b13f9f9e9736d0a7b3ee" ON "contract_component_oa_categories_oa_category" ("contractComponentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_643d8339348bf7aa1086228076" ON "contract_component_oa_categories_oa_category" ("oaCategoryId") `);
        await queryRunner.query(`CREATE TABLE "contract_component_pub_types_publication_type" ("contractComponentId" integer NOT NULL, "publicationTypeId" integer NOT NULL, CONSTRAINT "PK_2e02c92ba322a4a171c6450b65c" PRIMARY KEY ("contractComponentId", "publicationTypeId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5693043a32ff330349657d0dcf" ON "contract_component_pub_types_publication_type" ("contractComponentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_d9f2ef767248d2c935e1bd9e3a" ON "contract_component_pub_types_publication_type" ("publicationTypeId") `);
        await queryRunner.query(`CREATE TABLE "contract_component_greater_entities_greater_entity" ("contractComponentId" integer NOT NULL, "greaterEntityId" integer NOT NULL, CONSTRAINT "PK_34b59d0f10cb362ebe6e4d32c2b" PRIMARY KEY ("contractComponentId", "greaterEntityId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_62edc2c447bf4ec3dafa33ef2a" ON "contract_component_greater_entities_greater_entity" ("contractComponentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_9622d3a849051e64d597bc628b" ON "contract_component_greater_entities_greater_entity" ("greaterEntityId") `);
        await queryRunner.query(`CREATE TABLE "contract_component_cost_types_cost_type" ("contractComponentId" integer NOT NULL, "costTypeId" integer NOT NULL, CONSTRAINT "PK_97f3cbd5af21412a34b7d69c627" PRIMARY KEY ("contractComponentId", "costTypeId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4766ec209b14079cc2b949988c" ON "contract_component_cost_types_cost_type" ("contractComponentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_23e6c64f3a892df698e2a5a8a0" ON "contract_component_cost_types_cost_type" ("costTypeId") `);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "contractComponentId" integer`);
        await queryRunner.query(`ALTER TABLE "workflow_import" ADD CONSTRAINT "UQ_a6206e5ae06b4a0fdb941fe3c05" UNIQUE ("workflow_id", "version")`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD CONSTRAINT "FK_403d34b57af131c2b87eb7c901f" FOREIGN KEY ("contractComponentId") REFERENCES "contract_component"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "contract_component" ADD CONSTRAINT "FK_9eb8de910fe95a998c3c0bf3141" FOREIGN KEY ("contractId") REFERENCES "contract"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "contract_component_oa_categories_oa_category" ADD CONSTRAINT "FK_b7bef2b13f9f9e9736d0a7b3ee0" FOREIGN KEY ("contractComponentId") REFERENCES "contract_component"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "contract_component_oa_categories_oa_category" ADD CONSTRAINT "FK_643d8339348bf7aa1086228076a" FOREIGN KEY ("oaCategoryId") REFERENCES "oa_category"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "contract_component_pub_types_publication_type" ADD CONSTRAINT "FK_5693043a32ff330349657d0dcf5" FOREIGN KEY ("contractComponentId") REFERENCES "contract_component"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "contract_component_pub_types_publication_type" ADD CONSTRAINT "FK_d9f2ef767248d2c935e1bd9e3ae" FOREIGN KEY ("publicationTypeId") REFERENCES "publication_type"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "contract_component_greater_entities_greater_entity" ADD CONSTRAINT "FK_62edc2c447bf4ec3dafa33ef2af" FOREIGN KEY ("contractComponentId") REFERENCES "contract_component"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "contract_component_greater_entities_greater_entity" ADD CONSTRAINT "FK_9622d3a849051e64d597bc628b2" FOREIGN KEY ("greaterEntityId") REFERENCES "greater_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "contract_component_cost_types_cost_type" ADD CONSTRAINT "FK_4766ec209b14079cc2b949988c7" FOREIGN KEY ("contractComponentId") REFERENCES "contract_component"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "contract_component_cost_types_cost_type" ADD CONSTRAINT "FK_23e6c64f3a892df698e2a5a8a0d" FOREIGN KEY ("costTypeId") REFERENCES "cost_type"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contract_component_cost_types_cost_type" DROP CONSTRAINT "FK_23e6c64f3a892df698e2a5a8a0d"`);
        await queryRunner.query(`ALTER TABLE "contract_component_cost_types_cost_type" DROP CONSTRAINT "FK_4766ec209b14079cc2b949988c7"`);
        await queryRunner.query(`ALTER TABLE "contract_component_greater_entities_greater_entity" DROP CONSTRAINT "FK_9622d3a849051e64d597bc628b2"`);
        await queryRunner.query(`ALTER TABLE "contract_component_greater_entities_greater_entity" DROP CONSTRAINT "FK_62edc2c447bf4ec3dafa33ef2af"`);
        await queryRunner.query(`ALTER TABLE "contract_component_pub_types_publication_type" DROP CONSTRAINT "FK_d9f2ef767248d2c935e1bd9e3ae"`);
        await queryRunner.query(`ALTER TABLE "contract_component_pub_types_publication_type" DROP CONSTRAINT "FK_5693043a32ff330349657d0dcf5"`);
        await queryRunner.query(`ALTER TABLE "contract_component_oa_categories_oa_category" DROP CONSTRAINT "FK_643d8339348bf7aa1086228076a"`);
        await queryRunner.query(`ALTER TABLE "contract_component_oa_categories_oa_category" DROP CONSTRAINT "FK_b7bef2b13f9f9e9736d0a7b3ee0"`);
        await queryRunner.query(`ALTER TABLE "contract_component" DROP CONSTRAINT "FK_9eb8de910fe95a998c3c0bf3141"`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP CONSTRAINT "FK_403d34b57af131c2b87eb7c901f"`);
        await queryRunner.query(`ALTER TABLE "workflow_import" DROP CONSTRAINT "UQ_a6206e5ae06b4a0fdb941fe3c05"`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "contractComponentId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_23e6c64f3a892df698e2a5a8a0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4766ec209b14079cc2b949988c"`);
        await queryRunner.query(`DROP TABLE "contract_component_cost_types_cost_type"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9622d3a849051e64d597bc628b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_62edc2c447bf4ec3dafa33ef2a"`);
        await queryRunner.query(`DROP TABLE "contract_component_greater_entities_greater_entity"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d9f2ef767248d2c935e1bd9e3a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5693043a32ff330349657d0dcf"`);
        await queryRunner.query(`DROP TABLE "contract_component_pub_types_publication_type"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_643d8339348bf7aa1086228076"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b7bef2b13f9f9e9736d0a7b3ee"`);
        await queryRunner.query(`DROP TABLE "contract_component_oa_categories_oa_category"`);
        await queryRunner.query(`DROP TABLE "contract_component"`);
        await queryRunner.query(`DROP TYPE "public"."contract_component_contract_model_enum"`);
        await queryRunner.query(`ALTER TABLE "workflow_import" ADD CONSTRAINT "UQ_df41b3a5cdc3da7b056c9023304" UNIQUE ("workflow_id", "version")`);
    }

}
