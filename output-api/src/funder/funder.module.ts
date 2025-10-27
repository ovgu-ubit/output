import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { Funder } from './Funder.entity';
import { AliasFunder } from './AliasFunder.entity';
import { FunderController } from './FunderController';
import { FunderService } from './funder.service';
import { PublicationModule } from '../publication/publication.module';
import { AppConfigModule } from '../config/app-config.module';
import { AliasLookupService } from '../common/alias-lookup.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Funder, AliasFunder]),
    PublicationModule,
    AuthorizationModule,
    AppConfigModule
  ],
  controllers: [FunderController],
  providers: [FunderService, AliasLookupService],
  exports: [FunderService, TypeOrmModule]
})
export class FunderModule { }
