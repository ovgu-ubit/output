import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../../authorization/authorization.module';
import { Language } from './Language';
import { LanguageController } from './LanguageController';
import { Status } from './Status';
import { StatusController } from './StatusController';
import { LanguageService } from './language.service';
import { StatusService } from './status.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
          Language,
          Status
        ])
    , AuthorizationModule],
  controllers: [LanguageController, StatusController],
  providers: [LanguageService, StatusService],
  exports: [LanguageService, StatusService, TypeOrmModule]
})
export class PublicationLookupModule { }
