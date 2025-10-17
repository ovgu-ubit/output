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
import { Status } from './Status';
import { StatusController } from './StatusController';
import { StatusService } from './status.service';
import { Role } from './Role';
import { RoleController } from './RoleController';
import { RoleService } from './role.service';


const filterz = appConfig().filter_services;

@Module({
  imports: [TypeOrmModule.forFeature([Publication, AuthorPublication, PublicationIdentifier, 
    PublicationSupplement, PublicationDuplicate, Config, Language, Status, Role]),
    InstituteModule,
    InvoiceModule,
    AuthorizationModule],
  controllers: [PublicationController, LanguageController, StatusController, RoleController],
  providers: [PublicationService, LanguageService, AppConfigService,StatusService,RoleService,
    ...filterz.map(e => e.class),
    {
      provide: 'Filters',
      useFactory: (...filterz) => {
        return filterz
      },
      inject: filterz.map(e => e.class)
    },
  ],
  exports: [PublicationService, LanguageService, StatusService,RoleService, TypeOrmModule]
})
export class PublicationModule { }
