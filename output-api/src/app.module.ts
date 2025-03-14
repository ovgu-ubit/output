import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import appConfig from '../config';
import { AuthorController } from "./controller/AuthorController";
import { ConfigController } from "./controller/ConfigController";
import { ContractController } from "./controller/ContractController";
import { EnrichController } from "./controller/EnrichController";
import { ExportController } from "./controller/ExportController";
import { FunderController } from "./controller/FunderController";
import { GreaterEntityController } from "./controller/GreaterEntityController";
import { ImportController } from "./controller/ImportController";
import { InstituteController } from "./controller/InstituteController";
import { InvoiceController } from "./controller/InvoiceController";
import { LanguageController } from "./controller/LanguageController";
import { OACategoryController } from "./controller/OACategoryController";
import { PlausibilityController } from "./controller/PlausibilityController";
import { PublicationController } from "./controller/PublicationController";
import { PublicationTypeController } from "./controller/PublicationTypeController";
import { PublisherController } from "./controller/PublisherController";
import { RoleController } from "./controller/RoleController";
import { StatisticController } from "./controller/StatisticController";
import { StatusController } from "./controller/StatusController";
import { AliasAuthorFirstName } from "./entity/alias/AliasAuthorFirstName";
import { AliasAuthorLastName } from "./entity/alias/AliasAuthorLastName";
import { AliasFunder } from "./entity/alias/AliasFunder";
import { AliasInstitute } from "./entity/alias/AliasInstitute";
import { AliasPublisher } from "./entity/alias/AliasPublisher";
import { AliasPubType } from "./entity/alias/AliasPubType";
import { Author } from "./entity/Author";
import { AuthorPublication } from "./entity/AuthorPublication";
import { Config } from "./entity/Config";
import { Contract } from "./entity/Contract";
import { CostCenter } from "./entity/CostCenter";
import { CostItem } from "./entity/CostItem";
import { CostType } from "./entity/CostType";
import { Funder } from "./entity/Funder";
import { GreaterEntity } from "./entity/GreaterEntity";
import { ContractIdentifier } from "./entity/identifier/ContractIdentifier";
import { GEIdentifier } from "./entity/identifier/GEIdentifier";
import { PublicationIdentifier } from "./entity/identifier/PublicationIdentifier";
import { Institute } from "./entity/Institute";
import { Invoice } from "./entity/Invoice";
import { Language } from "./entity/Language";
import { OA_Category } from "./entity/OA_Category";
import { Publication } from "./entity/Publication";
import { PublicationType } from "./entity/PublicationType";
import { Publisher } from "./entity/Publisher";
import { PublisherDOI } from "./entity/PublisherDOI";
import { Role } from "./entity/Role";
import { Status } from "./entity/Status";
import { AuthorizationService } from "./guards/authorization.service";
import { AppConfigService } from "./services/app-config.service";
import { DatabaseConfigService } from "./services/database.config.service";
import { AuthorService } from "./services/entities/author.service";
import { ContractService } from "./services/entities/contract.service";
import { FunderService } from "./services/entities/funder.service";
import { GreaterEntityService } from "./services/entities/greater-entitiy.service";
import { InstitutionService } from "./services/entities/institution.service";
import { InvoiceService } from "./services/entities/invoice.service";
import { LanguageService } from "./services/entities/language.service";
import { OACategoryService } from "./services/entities/oa-category.service";
import { PublicationTypeService } from "./services/entities/publication-type.service";
import { PublicationService } from "./services/entities/publication.service";
import { PublisherService } from "./services/entities/publisher.service";
import { RoleService } from "./services/entities/role.service";
import { StatusService } from "./services/entities/status.service";
import { CSVImportService } from "./services/import/csv-import.service";
import { ExcelImportService } from "./services/import/excel-import.service";
import { ReportItemService } from "./services/report-item.service";
import { StatisticsService } from "./services/statistics.service";
import { DatabaseType, DataSourceOptions } from "typeorm";

const imports = appConfig().import_services;
const enrichs = appConfig().enrich_services;
const checks = appConfig().check_services;
const exportz = appConfig().export_services;
const filterz = appConfig().filter_services;

@Module({
  imports: [
    HttpModule.register({
      timeout: 50000,
      maxRedirects: 5,
    }),
    JwtModule.register({}),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [(process.env.NODE_ENV) ? `env.${process.env.NODE_ENV}` : 'env.template'],
      load: [appConfig]
    }),
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfigService,
      inject: [DatabaseConfigService],
    }),
    TypeOrmModule.forFeature([Author, AuthorPublication, Contract, ContractIdentifier, CostCenter, CostItem, CostType, Funder, GreaterEntity, GEIdentifier,
      Institute, Invoice, OA_Category, Publication, PublicationType, Publisher, PublisherDOI, Config, Language, Role, PublicationIdentifier,
      AliasInstitute, AliasPublisher, AliasPubType, AliasFunder, AliasAuthorFirstName, AliasAuthorLastName, Status]),
    ScheduleModule.forRoot()
  ],
  controllers: [AuthorController, PublicationController, StatisticController, ImportController, EnrichController, GreaterEntityController,
    PublisherController, ContractController, FunderController, InstituteController, PublicationTypeController, OACategoryController, LanguageController, InvoiceController,
    PlausibilityController, ExportController, ConfigController, RoleController, StatusController],
  providers: [
    PublicationService, GreaterEntityService, PublisherService, PublicationTypeService, AuthorService, InstitutionService, FunderService,
    OACategoryService, ContractService, ReportItemService, LanguageService, InvoiceService, RoleService, StatusService,
    AppConfigService, StatisticsService,
    CSVImportService, ExcelImportService,
    { provide: AuthorizationService, useClass: appConfig().authorization_service },
    ...imports.map(e => e.class),
    {
      provide: 'Imports',
      useFactory: (...imports) => {
        return imports
      },
      inject: imports.map(e => e.class)
    },
    ...enrichs.map(e => e.class),
    {
      provide: 'Enrichs',
      useFactory: (...enrichs) => {
        return enrichs
      },
      inject: enrichs.map(e => e.class)
    },
    ...checks.map(e => e.class),
    {
      provide: 'Checks',
      useFactory: (...checks) => {
        return checks
      },
      inject: checks.map(e => e.class)
    },
    ...exportz.map(e => e.class),
    {
      provide: 'Exports',
      useFactory: (...exportz) => {
        return exportz
      },
      inject: exportz.map(e => e.class)
    },
    ...filterz.map(e => e.class),
    {
      provide: 'Filters',
      useFactory: (...filterz) => {
        return filterz
      },
      inject: filterz.map(e => e.class)
    },
  ]
})

export class AppModule { }
