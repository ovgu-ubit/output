import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { PublicationModule } from '../publication/publication.module';
import { GreaterEntity } from './GreaterEntity';
import { GEIdentifier } from './GEIdentifier';
import { GreaterEntityController } from './GreaterEntityController';
import { GreaterEntityService } from './greater-entitiy.service';
import { AppConfigModule } from '../config/app-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GreaterEntity, GEIdentifier]), 
    PublicationModule, 
    AuthorizationModule,
    AppConfigModule
  ],
  controllers: [GreaterEntityController],
  providers: [GreaterEntityService],
  exports: [GreaterEntityService, TypeOrmModule]
})
export class GreaterEntityModule {}
