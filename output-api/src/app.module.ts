import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import appConfig from '../config';
import { AuthorModule } from './author/author.module';
import { AuthorizationModule } from "./authorization/authorization.module";
import { ContractModule } from "./contract/contract.module";
import { ConfigController } from "./controller/ConfigController";
import { EnrichController } from "./controller/EnrichController";
import { ExportController } from "./controller/ExportController";
import { ImportController } from "./controller/ImportController";
import { LanguageController } from "./controller/LanguageController";
import { PlausibilityController } from "./controller/PlausibilityController";
import { RoleController } from "./controller/RoleController";
import { StatisticController } from "./controller/StatisticController";
import { StatusController } from "./controller/StatusController";
import { Config } from "./entity/Config";
import { Language } from "./entity/Language";
import { Role } from "./entity/Role";
import { Status } from "./entity/Status";
import { FunderModule } from "./funder/funder.module";
import { GreaterEntityService } from "./greater_entity/greater-entitiy.service";
import { GreaterEntityModule } from "./greater_entity/greater-entity.module";
import { InstituteModule } from "./institute/institute.module";
import { InvoiceModule } from "./invoice/invoice.module";
import { OACategoryModule } from "./oa_category/oa-category.module";
import { PublicationTypeModule } from "./pub_type/pub-type.module";
import { PublicationModule } from './publication/publication.module';
import { PublisherModule } from "./publisher/publisher.module";
import { AppConfigService } from "./services/app-config.service";
import { DatabaseConfigService } from "./services/database.config.service";
import { LanguageService } from "./services/entities/language.service";
import { RoleService } from "./services/entities/role.service";
import { StatusService } from "./services/entities/status.service";
import { CSVImportService } from "./services/import/csv-import.service";
import { ExcelImportService } from "./services/import/excel-import.service";
import { ReportItemService } from "./services/report-item.service";
import { StatisticsService } from "./services/statistics.service";

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
    TypeOrmModule.forFeature([Config, Language, Role, Status]),
    ScheduleModule.forRoot(),
    AuthorModule,
    PublicationModule,
    InstituteModule,
    AuthorizationModule,
    ContractModule,
    FunderModule,
    GreaterEntityModule,
    InvoiceModule,
    OACategoryModule,
    PublicationTypeModule,
    PublisherModule
  ],
  controllers: [StatisticController, ImportController, EnrichController,
    LanguageController,
    PlausibilityController, ExportController, ConfigController, RoleController, StatusController],
  providers: [
    GreaterEntityService,
    ReportItemService, LanguageService, RoleService, StatusService,
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
