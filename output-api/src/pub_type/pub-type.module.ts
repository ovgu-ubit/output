import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { PublicationModule } from '../publication/publication.module';
import { PublicationType } from './PublicationType';
import { AliasPubType } from './AliasPubType';
import { PublicationTypeController } from './PublicationTypeController';
import { PublicationTypeService } from './publication-type.service';

@Module({
  imports: [TypeOrmModule.forFeature([PublicationType, AliasPubType]), PublicationModule, AuthorizationModule],
  controllers: [PublicationTypeController],
  providers: [PublicationTypeService],
  exports: [PublicationTypeService, TypeOrmModule]
})
export class PublicationTypeModule {}
