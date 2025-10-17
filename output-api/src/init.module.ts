import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthorPublication } from "./publication/AuthorPublication";
import { Config } from "./entity/Config";
import { Contract } from "./contract/Contract";
import { OA_Category } from "./oa_category/OA_Category";
import { Publisher } from "./entity/Publisher";
import { AppConfigService } from "./services/app-config.service";
import { DatabaseConfigService } from "./services/database.config.service";
import { GEIdentifier } from "./greater_entity/GEIdentifier";
import { AliasInstitute } from "./institute/AliasInstitute";
import { AliasPublisher } from "./entity/alias/AliasPublisher";
import { AliasPubType } from "./pub_type/AliasPubType";
import { AliasFunder } from "./funder/AliasFunder";
import { Language } from "./entity/Language";
import config from "../config";
import { PublisherDOI } from "./entity/PublisherDOI";
import { Role } from "./entity/Role";
import { Status } from "./entity/Status";
import { Institute } from "./institute/Institute";
import { AliasAuthorFirstName } from "./author/AliasAuthorFirstName";
import { AliasAuthorLastName } from "./author/AliasAuthorLastName";
import { Author } from "./author/Author";
import { Publication } from "./publication/Publication";
import { PublicationIdentifier } from "./publication/PublicationIdentifier";
import { Funder } from "./funder/Funder";
import { GreaterEntity } from "./greater_entity/GreaterEntity";
import { CostCenter } from "./invoice/CostCenter";
import { CostItem } from "./invoice/CostItem";
import { CostType } from "./invoice/CostType";
import { Invoice } from "./invoice/Invoice";
import { PublicationType } from "./pub_type/PublicationType";

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
  