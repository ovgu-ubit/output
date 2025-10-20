import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Institute } from './Institute';
import { InstituteController } from './InstituteController';
import { InstitutionService } from './institution.service';
import { AuthorPublication } from '../publication/relations/AuthorPublication';
import { AliasInstitute } from './AliasInstitute';
import { Author } from '../author/Author';
import { AuthorizationModule } from '../authorization/authorization.module';

@Module({
  imports: [TypeOrmModule.forFeature([Institute, AliasInstitute, AuthorPublication, Author]),
AuthorizationModule],
  controllers: [InstituteController],
  providers: 
  [InstitutionService],
  exports: [InstitutionService, TypeOrmModule]
})
export class InstituteModule { }
