import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Author } from "./entity/Author";
import { AuthorPublication } from "./entity/AuthorPublication";
import { Config } from "./entity/Config";
import { Contract } from "./entity/Contract";
import { CostCenter } from "./entity/CostCenter";
import { CostItem } from "./entity/CostItem";
import { CostType } from "./entity/CostType";
import { Funder } from "./entity/Funder";
import { GreaterEntity } from "./entity/GreaterEntity";
import { Institute } from "./entity/Institute";
import { Invoice } from "./entity/Invoice";
import { OA_Category } from "./entity/OA_Category";
import { Publication } from "./entity/Publication";
import { PublicationType } from "./entity/PublicationType";
import { Publisher } from "./entity/Publisher";
import { AppConfigService } from "./services/app-config.service";
import { DatabaseConfigService } from "./services/database.config.service";
import { Identifier } from "./entity/Identifier";
import { AliasInstitute } from "./entity/alias/AliasInstitute";
import { AliasPublisher } from "./entity/alias/AliasPublisher";
import { AliasPubType } from "./entity/alias/AliasPubType";
import { AliasFunder } from "./entity/alias/AliasFunder";
import { Language } from "./entity/Language";
import config from "../config";
import { PublisherDOI } from "./entity/PublisherDOI";
import { Role } from "./entity/Role";
import { PublicationIdentifier } from "./entity/PublicationIdentifier";
import { AliasAuthorLastName } from "./entity/alias/AliasAuthorLastName";
import { AliasAuthorFirstName } from "./entity/alias/AliasAuthorFirstName";

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
      TypeOrmModule.forFeature([Author, AuthorPublication, Contract, CostCenter, CostItem, CostType, Funder, GreaterEntity, Identifier, 
        Institute, Invoice, OA_Category, Publication, PublicationType, Publisher, PublisherDOI, Config, Language, Role, PublicationIdentifier, 
        AliasInstitute, AliasPublisher, AliasPubType, AliasFunder, AliasAuthorFirstName, AliasAuthorLastName])
    ],
    providers: [
      DatabaseConfigService, 
      AppConfigService, 
      config().init_service
      ]
  })
  
  export class InitModule { }
  