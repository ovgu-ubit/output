import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../config/app-config.module';
import { PublicationModule } from '../publication/publication.module';
import { AliasPubType } from './AliasPubType.entity';
import { PublicationType } from './PublicationType.entity';
import { PublicationTypeController } from './PublicationTypeController';
import { PublicationTypeService } from './publication-type.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PublicationType, AliasPubType]),
    PublicationModule,
    AppConfigModule
  ],
  controllers: [PublicationTypeController],
  providers: [PublicationTypeService],
  exports: [PublicationTypeService, TypeOrmModule]
})
export class PublicationTypeModule { }
