import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { PublicationModule } from '../publication/publication.module';
import { PublicationType } from './PublicationType.entity';
import { AliasPubType } from './AliasPubType.entity';
import { PublicationTypeController } from './PublicationTypeController';
import { PublicationTypeService } from './publication-type.service';
import { AppConfigModule } from '../config/app-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PublicationType, AliasPubType]),
    PublicationModule,
    AuthorizationModule,
    AppConfigModule
  ],
  controllers: [PublicationTypeController],
  providers: [PublicationTypeService],
  exports: [PublicationTypeService, TypeOrmModule]
})
export class PublicationTypeModule { }
