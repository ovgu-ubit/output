import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AliasLookupService } from '../common/alias-lookup.service';
import { AppConfigModule } from '../config/app-config.module';
import { InstituteModule } from '../institute/institute.module';
import { PublicationModule } from '../publication/publication.module';
import { AliasAuthorFirstName } from './AliasAuthorFirstName.entity';
import { AliasAuthorLastName } from './AliasAuthorLastName.entity';
import { Author } from './Author.entity';
import { AuthorController } from './AuthorController';
import { AuthorService } from './author.service';


@Module({
  imports: [
    TypeOrmModule.forFeature([Author,AliasAuthorFirstName,AliasAuthorLastName]), 
    PublicationModule,
    InstituteModule,
    AppConfigModule
  ],
  controllers: [AuthorController],
  providers: [AuthorService, AliasLookupService],
  exports: [AuthorService, TypeOrmModule]
})
export class AuthorModule {}
