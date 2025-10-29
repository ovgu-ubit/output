import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import appConfig from '../../../config';
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

const filterz = appConfig().filter_services;

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
    AppConfigModule],
  controllers: [PublicationController],
  providers: [PublicationService,
    ...filterz.map(e => e.class),
    {
      provide: 'Filters',
      useFactory: (...filterz) => {
        return filterz
      },
      inject: filterz.map(e => e.class)
    },
  ],
  exports: [PublicationService, TypeOrmModule]
})
export class PublicationCoreModule { }
