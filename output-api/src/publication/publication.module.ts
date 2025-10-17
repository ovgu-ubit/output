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
import { Invoice } from '../entity/Invoice';
import { CostItem } from '../entity/CostItem';
import { InstituteModule } from '../institute/institute.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AppConfigService } from '../services/app-config.service';
import { Config } from '../entity/Config';
import appConfig from '../../config';


const filterz = appConfig().filter_services;

@Module({
  imports: [TypeOrmModule.forFeature([Publication, AuthorPublication, PublicationIdentifier,PublicationSupplement,PublicationDuplicate,Invoice,CostItem,Config]), 
  AuthorModule, 
  InstituteModule,
AuthorizationModule],
  controllers: [PublicationController],
  providers: [PublicationService, AppConfigService,
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
export class PublicationModule {}
