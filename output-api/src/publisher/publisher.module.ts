import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { PublicationModule } from '../publication/publication.module';
import { AliasPublisher } from './AliasPublisher';
import { Publisher } from './Publisher';
import { PublisherDOI } from './PublisherDOI';
import { PublisherController } from './PublisherController';
import { PublisherService } from './publisher.service';
import { AppConfigModule } from '../config/app-config.module';
import { AliasLookupService } from '../common/alias-lookup.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Publisher, AliasPublisher, PublisherDOI]), 
    PublicationModule, 
    AuthorizationModule,
    AppConfigModule
  ],
  controllers: [PublisherController],
  providers: [PublisherService, AliasLookupService],
  exports: [PublisherService, TypeOrmModule]
})
export class PublisherModule {}
