import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import appConfig from '../../config';
import { AuthorModule } from '../author/author.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AppConfigModule } from '../config/app-config.module';
import { ContractModule } from '../contract/contract.module';
import { FunderModule } from '../funder/funder.module';
import { GreaterEntityModule } from '../greater_entity/greater-entity.module';
import { InstituteModule } from '../institute/institute.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { OACategoryModule } from '../oa_category/oa-category.module';
import { PublicationTypeModule } from '../pub_type/pub-type.module';
import { PublicationModule } from '../publication/publication.module';
import { PublisherModule } from '../publisher/publisher.module';
import { EnrichController } from './EnrichController';
import { ExportController } from './ExportController';
import { CSVImportService } from './import/csv-import.service';
import { ExcelImportService } from './import/excel-import.service';
import { ImportController } from './ImportController';
import { PlausibilityController } from './PlausibilityController';
import { ReportItemService } from './report-item.service';

const imports = appConfig().import_services;
const enrichs = appConfig().enrich_services;
const checks = appConfig().check_services;
const exportz = appConfig().export_services;
const filterz = appConfig().filter_services;

@Module({
  imports: [
    PublicationModule,
    AuthorModule,
    GreaterEntityModule,
    FunderModule,
    PublicationTypeModule,
    PublisherModule,
    OACategoryModule,
    ContractModule,
    InstituteModule,
    AppConfigModule,
    InvoiceModule,
    HttpModule.register({
      timeout: 50000,
      maxRedirects: 5,
    }),
    AuthorizationModule,
    ScheduleModule.forRoot()
  ],
  controllers: [
    ImportController,
    EnrichController,
    ExportController,
    PlausibilityController
  ],
  providers: [
    ReportItemService,
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
  },],
  exports: []
})
export class WorkflowModule { }
