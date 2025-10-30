import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import appConfig from '../../config';
import { AuthorModule } from '../author/author.module';
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
import { DiscoveryModule, DiscoveryService, ModuleRef } from '@nestjs/core';
import { AbstractImportService, getImportServiceMeta } from './import/abstract-import';
import { ApiEnrichDOIService, getEnrichServiceMeta } from './import/api-enrich-doi.service';
import { BASEImportService } from './import/base-import.service';
import { BibliographyImportService } from './import/bibliography-import.service';
import { CrossrefImportService } from './import/crossref-import.service';
import { OpenAccessMonitorImportService } from './import/open-access-monitor-import.service';
import { OpenAlexImportService } from './import/openalex-import.service';
import { PubMedImportService } from './import/pubmed-import';
import { ScopusImportService } from './import/scopus-import.service';
import { CrossrefEnrichService } from './import/crossref-enrich.service';
import { DOAJEnrichService } from './import/doaj-enrich.service';
import { OpenAccessMonitorEnrichService } from './import/open-access-monitor-enrich.service';
import { OpenAlexEnrichService } from './import/openalex-enrich.service';
import { OpenAPCEnrichService } from './import/openapc-enrich.service';
import { ScopusEnrichService } from './import/scopus-enrich.service';
import { UnpaywallEnrichService } from './import/unpaywall-enrich.service';

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
    ScheduleModule.forRoot(),
    DiscoveryModule
  ],
  controllers: [
    ImportController,
    EnrichController,
    ExportController,
    PlausibilityController
  ],
  providers: [
    ReportItemService,
    CSVImportService, ExcelImportService,BASEImportService,BibliographyImportService,CrossrefImportService,CSVImportService,OpenAccessMonitorImportService,OpenAlexImportService,PubMedImportService,ScopusImportService,BibliographyImportService,
    CrossrefEnrichService, DOAJEnrichService, OpenAccessMonitorEnrichService, OpenAlexEnrichService, OpenAPCEnrichService, ScopusEnrichService, UnpaywallEnrichService, 
    DiscoveryService,
    {
      provide: 'Imports',
      inject: [DiscoveryService, ModuleRef],
      useFactory: async (discovery: DiscoveryService, ref: ModuleRef) => {
        let providers = discovery.getProviders();
        let candidates = providers
          .map(p => p.metatype as Function | undefined)
          .filter(Boolean)
          .filter((t) => !!getImportServiceMeta(t!)) as Function[];

        let instances = await Promise.all(
          candidates.map(async (t) => ref.create(t as any)),
        );
        return instances as AbstractImportService[];
      }
    },
    {
      provide: 'Enrichs',
      inject: [DiscoveryService, ModuleRef],
      useFactory: async (discovery: DiscoveryService, ref: ModuleRef) => {
        let providers = discovery.getProviders();
        let candidates = providers
          .map(p => p.metatype as Function | undefined)
          .filter(Boolean)
          .filter((t) => !!getEnrichServiceMeta(t!)) as Function[];

        let instances = await Promise.all(
          candidates.map(async (t) => ref.create(t as any)),
        );
        return instances as ApiEnrichDOIService[];
      }
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
  exports: ['Imports', 'Enrichs']
})
export class WorkflowModule { }
