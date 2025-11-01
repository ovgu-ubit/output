import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../../config/app-config.module';
import { InstituteModule } from '../../institute/institute.module';
import { InvoiceModule } from '../../invoice/invoice.module';
import { PublicationRelationsModule } from '../relations/publication-relations.module';
import { Publication } from './Publication.entity';
import { PublicationController } from './PublicationController';
import { PublicationDuplicate } from './PublicationDuplicate.entity';
import { PublicationIdentifier } from './PublicationIdentifier.entity';
import { PublicationSupplement } from './PublicationSupplement.entity';
import { PublicationService } from './publication.service';
import { DiscoveryModule, DiscoveryService, ModuleRef } from '@nestjs/core';
import { AbstractFilterService, getFilterServiceMeta } from '../../workflow/filter/abstract-filter.service';
import { MissingInvoiceDataService } from '../../workflow/filter/missing-invoice-data-filter.service';
import { MissingInstFilterService } from '../../workflow/filter/missing-inst-filter.service';
import { MissingInstAuthorFilterService } from '../../workflow/filter/missing-inst-author-filter.service';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      Publication,
      PublicationIdentifier,
      PublicationSupplement,
      PublicationDuplicate
    ]),
    PublicationRelationsModule,
    InstituteModule,
    InvoiceModule,
    AppConfigModule,
    DiscoveryModule
  ],
  controllers: [PublicationController],
  providers: [PublicationService, MissingInstAuthorFilterService, MissingInstFilterService, MissingInvoiceDataService,
    {
      provide: 'Filters',
      inject: [DiscoveryService, ModuleRef],
      useFactory: async (discovery: DiscoveryService, ref: ModuleRef) => {
        let providers = discovery.getProviders();
        let candidates = providers
          .map(p => p.metatype as Function | undefined)
          .filter(Boolean)
          .filter((t) => !!getFilterServiceMeta(t!)) as Function[];

        let instances = await Promise.all(
          candidates.map(async (t) => ref.create(t as any)),
        );
        return instances as AbstractFilterService<any>[];
      }
    }
  ],
  exports: [PublicationService, TypeOrmModule, 'Filters']
})
export class PublicationCoreModule { }
