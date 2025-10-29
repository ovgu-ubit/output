import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AliasLookupService } from '../common/alias-lookup.service';
import { AppConfigModule } from '../config/app-config.module';
import { PublicationModule } from '../publication/publication.module';
import { AliasPublisher } from './AliasPublisher.entity';
import { Publisher } from './Publisher.entity';
import { PublisherController } from './PublisherController';
import { PublisherDOI } from './PublisherDOI.entity';
import { PublisherService } from './publisher.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Publisher, AliasPublisher, PublisherDOI]), 
    PublicationModule, 
    AppConfigModule
  ],
  controllers: [PublisherController],
  providers: [PublisherService, AliasLookupService],
  exports: [PublisherService, TypeOrmModule]
})
export class PublisherModule {}
