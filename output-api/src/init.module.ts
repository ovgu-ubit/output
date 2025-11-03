import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
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

@Module({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: [(process.env.NODE_ENV) ? `env.${process.env.NODE_ENV}` : 'env.template'],
      }),
      TypeOrmModule.forRootAsync({
        useClass: DatabaseConfigService,
        inject: [DatabaseConfigService],
      }),
      TypeOrmModule.forFeature([Author, AuthorPublication, Contract, CostCenter, CostItem, CostType, Funder, GreaterEntity, GEIdentifier, 
        Institute, Invoice, OA_Category, Publication, PublicationType, Publisher, PublisherDOI, Config, Language, Role, PublicationIdentifier, 
        AliasInstitute, AliasPublisher, AliasPubType, AliasFunder, AliasAuthorFirstName, AliasAuthorLastName, Status])
    ],
    providers: [
      DatabaseConfigService, 
      AppConfigService, 
      InitService
      ]
  })
  
  export class InitModule { }
  