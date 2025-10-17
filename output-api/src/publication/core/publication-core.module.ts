import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import appConfig from '../../../config';
import { AuthorizationModule } from '../../authorization/authorization.module';
import { Config } from '../../entity/Config';
import { InstituteModule } from '../../institute/institute.module';
import { InvoiceModule } from '../../invoice/invoice.module';
import { AppConfigService } from '../../services/app-config.service';
import { Publication } from './Publication';
import { PublicationController } from './PublicationController';
import { PublicationDuplicate } from './PublicationDuplicate';
import { PublicationIdentifier } from './PublicationIdentifier';
import { PublicationSupplement } from './PublicationSupplement';
import { PublicationService } from './publication.service';

const filterz = appConfig().filter_services;

@Module({
  imports: [
    TypeOrmModule.forFeature([
          Publication,
          PublicationIdentifier,
          PublicationSupplement,
          PublicationDuplicate,
          Config
        ]),
    InstituteModule,
    InvoiceModule, 
    AuthorizationModule],
  controllers: [PublicationController],
  providers: [PublicationService,
    AppConfigService,
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
