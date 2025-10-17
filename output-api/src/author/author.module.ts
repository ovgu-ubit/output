import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Author } from './Author';
import { AuthorController } from './AuthorController';
import { AuthorService } from './author.service';
import { InstituteModule } from '../institute/institute.module';
import { AliasAuthorFirstName } from './AliasAuthorFirstName';
import { AliasAuthorLastName } from './AliasAuthorLastName';
import { AuthorizationModule } from '../authorization/authorization.module';


@Module({
  imports: [TypeOrmModule.forFeature([Author,AliasAuthorFirstName,AliasAuthorLastName]), InstituteModule,AuthorizationModule],
  controllers: [AuthorController],
  providers: [AuthorService],
  exports: [AuthorService, TypeOrmModule]
})
export class AuthorModule {}
