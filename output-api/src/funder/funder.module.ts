import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AliasLookupService } from '../common/alias-lookup.service';
import { AppConfigModule } from '../config/app-config.module';
import { PublicationModule } from '../publication/publication.module';
import { AliasFunder } from './AliasFunder.entity';
import { Funder } from './Funder.entity';
import { FunderController } from './FunderController';
import { FunderService } from './funder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Funder, AliasFunder]),
    PublicationModule,
    AppConfigModule
  ],
  controllers: [FunderController],
  providers: [FunderService, AliasLookupService],
  exports: [FunderService, TypeOrmModule]
})
export class FunderModule { }
