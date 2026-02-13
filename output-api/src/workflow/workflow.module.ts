import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { DiscoveryModule, DiscoveryService, ModuleRef } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
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
import { AbstractPlausibilityService, getPlausibilityServiceMeta } from './check/abstract-plausibility.service';
import { DOIandTitleDuplicateCheck } from './check/doi-and-title-duplicate.service';
import { PublisherDOIPrefixService } from './check/publisher_doi_prefix.service';
import { EnrichController } from './EnrichController';
import { AbstractExportService, getExportServiceMeta } from './export/abstract-export.service';
import { AuthorExportService } from './export/author-export.service';
import { ContractExportService } from './export/contract-export.service';
import { CostCenterExportService } from './export/cost-center-export.service';
import { CostTypeExportService } from './export/cost-type-export.service';
import { ExcelExportService } from './export/excel-export.service';
import { FunderExportService } from './export/funder-export.service';
import { GreaterEntityExportService } from './export/greater-entity-export.service';
import { InstituteExportService } from './export/institute-export.service';
import { JulichExportService } from './export/julich-export.service';
import { MasterExportService } from './export/master-export.service';
import { OACatExportService } from './export/oa-cat-export.service';
import { OpenAPCExportService } from './export/openapc-export.service';
import { PubTypeExportService } from './export/pub-type-export.service';
import { PublisherExportService } from './export/publisher-export.service';
import { ExportController } from './ExportController';
import { AbstractImportService, getImportServiceMeta } from './import/abstract-import';
import { ApiEnrichDOIService, getEnrichServiceMeta } from './import/api-enrich-doi.service';
import { BASEImportService } from './import/base-import.service';
import { BibliographyImportService } from './import/bibliography-import.service';
import { CrossrefEnrichService } from './import/crossref-enrich.service';
import { CrossrefImportService } from './import/crossref-import.service';
import { CSVImportService } from './import/csv-import.service';
import { DOAJEnrichService } from './import/doaj-enrich.service';
import { ExcelImportService } from './import/excel-import.service';
import { OpenAccessMonitorEnrichService } from './import/open-access-monitor-enrich.service';
import { OpenAccessMonitorImportService } from './import/open-access-monitor-import.service';
import { OpenAlexEnrichService } from './import/openalex-enrich.service';
import { OpenAlexImportService } from './import/openalex-import.service';
import { OpenAPCEnrichService } from './import/openapc-enrich.service';
import { PubMedImportService } from './import/pubmed-import';
import { ScopusEnrichService } from './import/scopus-enrich.service';
import { ScopusImportService } from './import/scopus-import.service';
import { UnpaywallEnrichService } from './import/unpaywall-enrich.service';
import { ImportController } from './ImportController';
import { PlausibilityController } from './PlausibilityController';
import { ReportItemService } from './report-item.service';
import { JSONataImportService } from './import/jsonata-import';
import { WorkflowService } from './workflow.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportWorkflow } from './ImportWorkflow.entity';
import { WorkflowController } from './WorkflowController';

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
    DiscoveryModule,
    TypeOrmModule.forFeature([ImportWorkflow])
  ],
  controllers: [
    ImportController,
    EnrichController,
    ExportController,
    PlausibilityController,
    WorkflowController
  ],
  providers: [
    ReportItemService,
    CSVImportService, ExcelImportService,BASEImportService,BibliographyImportService,CrossrefImportService,
    CSVImportService,OpenAccessMonitorImportService,OpenAlexImportService,PubMedImportService,ScopusImportService,
    BibliographyImportService,JSONataImportService,
    CrossrefEnrichService, DOAJEnrichService, OpenAccessMonitorEnrichService, OpenAlexEnrichService, OpenAPCEnrichService, ScopusEnrichService, UnpaywallEnrichService, 
    DOIandTitleDuplicateCheck, PublisherDOIPrefixService,
    AuthorExportService, ContractExportService, CostCenterExportService, CostTypeExportService, ExcelExportService, FunderExportService, GreaterEntityExportService, InstituteExportService, JulichExportService, MasterExportService, OACatExportService, OpenAPCExportService, PubTypeExportService, PublisherExportService,
    DiscoveryService, WorkflowService,
    {
      provide: 'Imports',
      inject: [DiscoveryService, ModuleRef],
      useFactory: async (discovery: DiscoveryService, ref: ModuleRef) => {
        const providers = discovery.getProviders();
        const candidates = providers
          .map(p => p.metatype as Function | undefined)
          .filter(Boolean)
          .filter((t) => !!getImportServiceMeta(t!)) as Function[];

        const instances = await Promise.all(
          candidates.map(async (t) => ref.create(t as any)),
        );
        return instances as AbstractImportService[];
      }
    },
    {
      provide: 'Enrichs',
      inject: [DiscoveryService, ModuleRef],
      useFactory: async (discovery: DiscoveryService, ref: ModuleRef) => {
        const providers = discovery.getProviders();
        const candidates = providers
          .map(p => p.metatype as Function | undefined)
          .filter(Boolean)
          .filter((t) => !!getEnrichServiceMeta(t!)) as Function[];

        const instances = await Promise.all(
          candidates.map(async (t) => ref.create(t as any)),
        );
        return instances as ApiEnrichDOIService[];
      }
    },{
      provide: 'Checks',
      inject: [DiscoveryService, ModuleRef],
      useFactory: async (discovery: DiscoveryService, ref: ModuleRef) => {
        const providers = discovery.getProviders();
        const candidates = providers
          .map(p => p.metatype as Function | undefined)
          .filter(Boolean)
          .filter((t) => !!getPlausibilityServiceMeta(t!)) as Function[];

        const instances = await Promise.all(
          candidates.map(async (t) => ref.create(t as any)),
        );
        return instances as AbstractPlausibilityService[];
      }
    },{
      provide: 'Exports',
      inject: [DiscoveryService, ModuleRef],
      useFactory: async (discovery: DiscoveryService, ref: ModuleRef) => {
        const providers = discovery.getProviders();
        const candidates = providers
          .map(p => p.metatype as Function | undefined)
          .filter(Boolean)
          .filter((t) => !!getExportServiceMeta(t!)) as Function[];

        const instances = await Promise.all(
          candidates.map(async (t) => ref.create(t as any)),
        );
        return instances as AbstractExportService[];
      }
    },],
  exports: ['Imports', 'Enrichs', 'Exports', 'Checks']
})
export class WorkflowModule { }
