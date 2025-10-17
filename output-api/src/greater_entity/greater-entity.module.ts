import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { PublicationModule } from '../publication/publication.module';
import { GreaterEntity } from './GreaterEntity';
import { GEIdentifier } from './GEIdentifier';
import { GreaterEntityController } from './GreaterEntityController';
import { GreaterEntityService } from '../services/entities/greater-entitiy.service';

@Module({
  imports: [TypeOrmModule.forFeature([GreaterEntity, GEIdentifier]), PublicationModule, AuthorizationModule],
  controllers: [GreaterEntityController],
  providers: [GreaterEntityService],
  exports: [GreaterEntityService, TypeOrmModule]
})
export class GreaterEntityModule {}
