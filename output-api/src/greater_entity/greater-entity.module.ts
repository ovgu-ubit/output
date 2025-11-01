import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../config/app-config.module';
import { PublicationModule } from '../publication/publication.module';
import { GEIdentifier } from './GEIdentifier.entity';
import { GreaterEntity } from './GreaterEntity.entity';
import { GreaterEntityController } from './GreaterEntityController';
import { GreaterEntityService } from './greater-entitiy.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([GreaterEntity, GEIdentifier]), 
    PublicationModule, 
    AppConfigModule
  ],
  controllers: [GreaterEntityController],
  providers: [GreaterEntityService],
  exports: [GreaterEntityService, TypeOrmModule]
})
export class GreaterEntityModule {}
