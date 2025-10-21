import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { Funder } from './Funder';
import { AliasFunder } from './AliasFunder';
import { FunderController } from './FunderController';
import { FunderService } from './funder.service';
import { PublicationModule } from '../publication/publication.module';
import { AppConfigModule } from '../config/app-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Funder, AliasFunder]),
    PublicationModule,
    AuthorizationModule,
    AppConfigModule
  ],
  controllers: [FunderController],
  providers: [FunderService],
  exports: [FunderService, TypeOrmModule]
})
export class FunderModule { }
