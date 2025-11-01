import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Author } from '../author/Author.entity';
import { AliasLookupService } from '../common/alias-lookup.service';
import { AppConfigModule } from '../config/app-config.module';
import { AuthorPublication } from '../publication/relations/AuthorPublication.entity';
import { AliasInstitute } from './AliasInstitute.entity';
import { Institute } from './Institute.entity';
import { InstituteController } from './InstituteController';
import { InstituteService } from './institute.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Institute, AliasInstitute, AuthorPublication, Author]),
    AppConfigModule
  ],
  controllers: [InstituteController],
  providers:
    [InstituteService, AliasLookupService],
  exports: [InstituteService, TypeOrmModule]
})
export class InstituteModule { }
