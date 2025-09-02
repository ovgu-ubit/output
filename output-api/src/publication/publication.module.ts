import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Publication } from './Publication';
import { PublicationController } from './PublicationController';
import { PublicationService } from './publication.service';

@Module({
  imports: [TypeOrmModule.forFeature([Publication])],
  controllers: [PublicationController],
  providers: [PublicationService],
  exports: [PublicationService, TypeOrmModule]
})
export class PublicationModule {}
