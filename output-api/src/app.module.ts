import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import appConfig from '../config';
import { AuthorModule } from './author/author.module';
import { AuthorizationModule } from "./authorization/authorization.module";
import { AppConfigModule } from "./config/app-config.module";
import { ContractModule } from "./contract/contract.module";
import { EnrichController } from "./controller/EnrichController";
import { ExportController } from "./controller/ExportController";
import { ImportController } from "./controller/ImportController";
import { PlausibilityController } from "./controller/PlausibilityController";
import { StatisticController } from "./controller/StatisticController";
import { FunderModule } from "./funder/funder.module";
import { GreaterEntityService } from "./greater_entity/greater-entitiy.service";
import { GreaterEntityModule } from "./greater_entity/greater-entity.module";
import { InstituteModule } from "./institute/institute.module";
import { InvoiceModule } from "./invoice/invoice.module";
import { OACategoryModule } from "./oa_category/oa-category.module";
import { PublicationTypeModule } from "./pub_type/pub-type.module";
import { PublicationModule } from './publication/publication.module';
import { PublisherModule } from "./publisher/publisher.module";
import { DatabaseConfigService } from "./services/database.config.service";
import { CSVImportService } from "./services/import/csv-import.service";
import { ExcelImportService } from "./services/import/excel-import.service";
import { ReportItemService } from "./services/report-item.service";
import { StatisticsService } from "./services/statistics.service";
import { AppConfigService } from "./config/app-config.service";

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
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfigService
    }),
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
    PublisherModule,
    AppConfigModule
  ],
  controllers: [StatisticController, ImportController, EnrichController,
    PlausibilityController, ExportController],
  providers: [
    GreaterEntityService,
    ReportItemService, StatisticsService,
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
