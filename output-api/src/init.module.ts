import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthorPublication } from "./publication/relations/AuthorPublication.entity";
import { Config } from "./config/Config.entity";
import { Contract } from "./contract/Contract.entity";
import { OA_Category } from "./oa_category/OA_Category.entity";
import { Publisher } from "./publisher/Publisher.entity";
import { AppConfigService } from "./config/app-config.service";
import { DatabaseConfigService } from "./config/database.config.service";
import { GEIdentifier } from "./greater_entity/GEIdentifier.entity";
import { AliasInstitute } from "./institute/AliasInstitute.entity";
import { AliasPubType } from "./pub_type/AliasPubType.entity";
import { AliasFunder } from "./funder/AliasFunder.entity";
import { Institute } from "./institute/Institute.entity";
import { AliasAuthorFirstName } from "./author/AliasAuthorFirstName.entity";
import { AliasAuthorLastName } from "./author/AliasAuthorLastName.entity";
import { Author } from "./author/Author.entity";
import { Publication } from "./publication/core/Publication.entity";
import { PublicationIdentifier } from "./publication/core/PublicationIdentifier.entity";
import { Funder } from "./funder/Funder.entity";
import { GreaterEntity } from "./greater_entity/GreaterEntity.entity";
import { CostCenter } from "./invoice/CostCenter.entity";
import { CostItem } from "./invoice/CostItem.entity";
import { CostType } from "./invoice/CostType.entity";
import { Invoice } from "./invoice/Invoice.entity";
import { PublicationType } from "./pub_type/PublicationType.entity";
import { PublisherDOI } from "./publisher/PublisherDOI.entity";
import { AliasPublisher } from "./publisher/AliasPublisher.entity";
import { Role } from "./publication/relations/Role.entity";
import { Status } from "./publication/lookups/Status.entity";
import { Language } from "./publication/lookups/Language.entity";
import { InitService } from "./init.service";
import { ContractIdentifier } from "./contract/ContractIdentifier.entity";
import { PublicationDuplicate } from "./publication/core/PublicationDuplicate.entity";
import { PublicationSupplement } from "./publication/core/PublicationSupplement.entity";
import path from "path";
import { EnvSchemas } from "./config/environment.schema";


const configDir = process.env.CONFIG_DIR || process.cwd();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: false,
      envFilePath: [(process.env.NODE_ENV) ? path.resolve(configDir, `env.${process.env.NODE_ENV}`) : path.resolve(configDir, 'env.template')],
      validate: (env) => {
        const schema = EnvSchemas
          .passthrough();

        const result = schema.safeParse(env);
        if (!result.success) {
          throw new Error(`Invalid environment configuration: ${result.error}`);
        }
        return result.data;
      }
    }),
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfigService,
      imports: [ConfigModule],
    }),
    TypeOrmModule.forFeature([
      Author, AliasAuthorFirstName, AliasAuthorLastName,
      Config,
      Contract, ContractIdentifier,
      Funder, AliasFunder,
      GreaterEntity, GEIdentifier,
      Institute, AliasInstitute,
      CostCenter, CostItem, CostType, Invoice,
      OA_Category,
      PublicationType, AliasPubType,
      Publication, PublicationIdentifier, AuthorPublication, Language, Role, Status, PublicationDuplicate, PublicationSupplement,
      Publisher, PublisherDOI, AliasPublisher,
    ])
  ],
  providers: [
    DatabaseConfigService,
    AppConfigService,
    InitService
  ]
})

export class InitModule { }
