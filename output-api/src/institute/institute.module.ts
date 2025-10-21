import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Institute } from './Institute';
import { InstituteController } from './InstituteController';
import { InstituteService } from './institute.service';
import { AuthorPublication } from '../publication/relations/AuthorPublication';
import { AliasInstitute } from './AliasInstitute';
import { Author } from '../author/Author';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AppConfigModule } from '../config/app-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Institute, AliasInstitute, AuthorPublication, Author]),
    AuthorizationModule,
    AppConfigModule
  ],
  controllers: [InstituteController],
  providers:
    [InstituteService],
  exports: [InstituteService, TypeOrmModule]
})
export class InstituteModule { }
