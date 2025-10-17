import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import appConfig from '../config';
import { AuthorModule } from './author/author.module';
import { ConfigController } from "./controller/ConfigController";
import { ContractController } from "./contract/ContractController";
import { EnrichController } from "./controller/EnrichController";
import { ExportController } from "./controller/ExportController";
import { FunderController } from "./controller/FunderController";
import { GreaterEntityController } from "./controller/GreaterEntityController";
import { ImportController } from "./controller/ImportController";
import { InvoiceController } from "./controller/InvoiceController";
import { LanguageController } from "./controller/LanguageController";
import { OACategoryController } from "./controller/OACategoryController";
import { PlausibilityController } from "./controller/PlausibilityController";
import { PublicationTypeController } from "./controller/PublicationTypeController";
import { PublisherController } from "./controller/PublisherController";
import { RoleController } from "./controller/RoleController";
import { StatisticController } from "./controller/StatisticController";
import { StatusController } from "./controller/StatusController";
import { AliasFunder } from "./entity/alias/AliasFunder";
import { AliasPublisher } from "./entity/alias/AliasPublisher";
import { AliasPubType } from "./entity/alias/AliasPubType";
import { Config } from "./entity/Config";
import { Contract } from "./contract/Contract";
import { CostCenter } from "./entity/CostCenter";
import { CostItem } from "./entity/CostItem";
import { CostType } from "./entity/CostType";
import { Funder } from "./entity/Funder";
import { GreaterEntity } from "./entity/GreaterEntity";
import { GEIdentifier } from "./entity/identifier/GEIdentifier";
import { Invoice } from "./entity/Invoice";
import { Language } from "./entity/Language";
import { OA_Category } from "./entity/OA_Category";
import { PublicationType } from "./entity/PublicationType";
import { Publisher } from "./entity/Publisher";
import { PublisherDOI } from "./entity/PublisherDOI";
import { Role } from "./entity/Role";
import { Status } from "./entity/Status";
import { InstituteModule } from "./institute/institute.module";
import { PublicationModule } from './publication/publication.module';
import { AppConfigService } from "./services/app-config.service";
import { DatabaseConfigService } from "./services/database.config.service";
import { ContractService } from "./contract/contract.service";
import { FunderService } from "./services/entities/funder.service";
import { GreaterEntityService } from "./services/entities/greater-entitiy.service";
import { InvoiceService } from "./services/entities/invoice.service";
import { LanguageService } from "./services/entities/language.service";
import { OACategoryService } from "./services/entities/oa-category.service";
import { PublicationTypeService } from "./services/entities/publication-type.service";
import { PublisherService } from "./services/entities/publisher.service";
import { RoleService } from "./services/entities/role.service";
import { StatusService } from "./services/entities/status.service";
import { CSVImportService } from "./services/import/csv-import.service";
import { ExcelImportService } from "./services/import/excel-import.service";
import { ReportItemService } from "./services/report-item.service";
import { StatisticsService } from "./services/statistics.service";
import { AuthorizationModule } from "./authorization/authorization.module";
import { ContractModule } from "./contract/contract.module";

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
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [(process.env.NODE_ENV) ? `env.${process.env.NODE_ENV}` : 'env.template'],
      load: [appConfig]
    }),
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfigService,
      inject: [DatabaseConfigService],
    }),
    TypeOrmModule.forFeature([CostCenter, CostItem, CostType, Funder, GreaterEntity, 
      GEIdentifier, Invoice, OA_Category, PublicationType, Publisher, PublisherDOI, Config, Language, Role,
       AliasPublisher, AliasPubType, AliasFunder, Status]),
    ScheduleModule.forRoot(),
    AuthorModule,
    PublicationModule,
    InstituteModule,
    AuthorizationModule,
    ContractModule
  ],
  controllers: [StatisticController, ImportController, EnrichController, GreaterEntityController,
    PublisherController, FunderController, PublicationTypeController, OACategoryController, LanguageController, InvoiceController,
    PlausibilityController, ExportController, ConfigController, RoleController, StatusController],
  providers: [
    GreaterEntityService, PublisherService, PublicationTypeService, FunderService,
    OACategoryService, ReportItemService, LanguageService, InvoiceService, RoleService, StatusService,
    AppConfigService, StatisticsService,
    CSVImportService, ExcelImportService,
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
