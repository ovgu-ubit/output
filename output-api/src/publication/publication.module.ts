import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Publication } from './Publication';
import { PublicationController } from './PublicationController';
import { PublicationService } from './publication.service';
import { AuthorModule } from '../author/author.module';
import { AuthorPublication } from './AuthorPublication';
import { PublicationIdentifier } from './PublicationIdentifier';
import { PublicationDuplicate } from './PublicationDuplicate';
import { PublicationSupplement } from './PublicationSupplement';
import { InstituteModule } from '../institute/institute.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AppConfigService } from '../services/app-config.service';
import { Config } from '../entity/Config';
import appConfig from '../../config';
import { InvoiceModule } from '../invoice/invoice.module';
import { Language } from './Language';
import { LanguageController } from './LanguageController';
import { LanguageService } from './language.service';


const filterz = appConfig().filter_services;

@Module({
  imports: [TypeOrmModule.forFeature([Publication, AuthorPublication, PublicationIdentifier, 
    PublicationSupplement, PublicationDuplicate, Config, Language]),
    AuthorModule,
    InstituteModule,
    InvoiceModule,
    AuthorizationModule],
  controllers: [PublicationController, LanguageController],
  providers: [PublicationService, LanguageService, AppConfigService,
    ...filterz.map(e => e.class),
    {
      provide: 'Filters',
      useFactory: (...filterz) => {
        return filterz
      },
      inject: filterz.map(e => e.class)
    },
  ],
  exports: [PublicationService, LanguageService, TypeOrmModule]
})
export class PublicationModule { }
