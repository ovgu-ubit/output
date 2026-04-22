import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../../config/app-config.module';
import { InstituteModule } from '../../institute/institute.module';
import { InvoiceModule } from '../../invoice/invoice.module';
import { PublicationRelationsModule } from '../relations/publication-relations.module';
import { Publication } from './Publication.entity';
import { PublicationController } from './PublicationController';
import { PublicationChange } from './PublicationChange.entity';
import { PublicationDuplicate } from './PublicationDuplicate.entity';
import { PublicationIdentifier } from './PublicationIdentifier.entity';
import { PublicationSupplement } from './PublicationSupplement.entity';
import { PublicationChangeService } from './publication-change.service';
import { PublicationService } from './publication.service';
import { DiscoveryModule, DiscoveryService, ModuleRef } from '@nestjs/core';
import { AbstractFilterService, getFilterServiceMeta } from '../../workflow/filter/abstract-filter.service';
import { MissingInvoiceDataService } from '../../workflow/filter/missing-invoice-data-filter.service';
import { MissingInstFilterService } from '../../workflow/filter/missing-inst-filter.service';
import { MissingInstAuthorFilterService } from '../../workflow/filter/missing-inst-author-filter.service';
import { WorkflowReport } from '../../workflow/WorkflowReport.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      Publication,
      PublicationChange,
      PublicationIdentifier,
      PublicationSupplement,
      PublicationDuplicate,
      WorkflowReport
    ]),
    PublicationRelationsModule,
    InstituteModule,
    InvoiceModule,
    AppConfigModule,
    DiscoveryModule
  ],
  controllers: [PublicationController],
  providers: [PublicationService, PublicationChangeService, MissingInstAuthorFilterService, MissingInstFilterService, MissingInvoiceDataService,
    {
      provide: 'Filters',
      inject: [DiscoveryService, ModuleRef],
      useFactory: async (discovery: DiscoveryService, ref: ModuleRef) => {
        const providers = discovery.getProviders();
        const candidates = providers
          .map(p => p.metatype as Function | undefined)
          .filter(Boolean)
          .filter((t) => !!getFilterServiceMeta(t!)) as Function[];

        const instances = await Promise.all(
          candidates.map(async (t) => ref.create(t as any)),
        );
        return instances as AbstractFilterService<any>[];
      }
    }
  ],
  exports: [PublicationService, PublicationChangeService, TypeOrmModule, 'Filters']
})
export class PublicationCoreModule { }
