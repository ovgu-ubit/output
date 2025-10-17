import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Institute } from './Institute';
import { InstituteController } from './InstituteController';
import { InstitutionService } from './institution.service';
import { AuthorPublication } from '../publication/AuthorPublication';
import { AliasInstitute } from './AliasInstitute';
import { Author } from '../author/Author';
import { INSTITUTES_AFFILIATION_PORT, INSTITUTES_FIND_SUB_FLAT } from '../ports';
import { AuthorizationModule } from '../authorization/authorization.module';

@Module({
  imports: [TypeOrmModule.forFeature([Institute, AliasInstitute, AuthorPublication, Author]),
AuthorizationModule],
  controllers: [InstituteController],
  providers: 
  [InstitutionService,
    { provide: INSTITUTES_AFFILIATION_PORT, useExisting: InstitutionService },
    { provide: INSTITUTES_FIND_SUB_FLAT, useExisting: InstitutionService }
  ],
  exports: [InstitutionService, TypeOrmModule, INSTITUTES_AFFILIATION_PORT, INSTITUTES_FIND_SUB_FLAT]
})
export class InstituteModule { }
