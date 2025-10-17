import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthorPublication } from "./publication/relations/AuthorPublication";
import { Config } from "./entity/Config";
import { Contract } from "./contract/Contract";
import { OA_Category } from "./oa_category/OA_Category";
import { Publisher } from "./publisher/Publisher";
import { AppConfigService } from "./services/app-config.service";
import { DatabaseConfigService } from "./services/database.config.service";
import { GEIdentifier } from "./greater_entity/GEIdentifier";
import { AliasInstitute } from "./institute/AliasInstitute";
import { AliasPubType } from "./pub_type/AliasPubType";
import { AliasFunder } from "./funder/AliasFunder";
import config from "../config";
import { Institute } from "./institute/Institute";
import { AliasAuthorFirstName } from "./author/AliasAuthorFirstName";
import { AliasAuthorLastName } from "./author/AliasAuthorLastName";
import { Author } from "./author/Author";
import { Publication } from "./publication/core/Publication";
import { PublicationIdentifier } from "./publication/core/PublicationIdentifier";
import { Funder } from "./funder/Funder";
import { GreaterEntity } from "./greater_entity/GreaterEntity";
import { CostCenter } from "./invoice/CostCenter";
import { CostItem } from "./invoice/CostItem";
import { CostType } from "./invoice/CostType";
import { Invoice } from "./invoice/Invoice";
import { PublicationType } from "./pub_type/PublicationType";
import { PublisherDOI } from "./publisher/PublisherDOI";
import { AliasPublisher } from "./publisher/AliasPublisher";
import { Role } from "./publication/relations/Role";
import { Status } from "./publication/lookups/Status";
import { Language } from "./publication/lookups/Language";

//export const init_service = require(config().init_service)
//export const init_service = import (config().init_service);

@Module({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: [(process.env.NODE_ENV) ? `env.${process.env.NODE_ENV}` : 'env.template'],
        load: [config]
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
      config().init_service
      ]
  })
  
  export class InitModule { }
  