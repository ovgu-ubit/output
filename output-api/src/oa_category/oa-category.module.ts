import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { PublicationModule } from '../publication/publication.module';
import { OA_Category } from './OA_Category.entity';
import { OACategoryController } from './OACategoryController';
import { OACategoryService } from './oa-category.service';
import { AppConfigModule } from '../config/app-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OA_Category]), 
    PublicationModule, 
    AuthorizationModule,
    AppConfigModule
  ],
  controllers: [OACategoryController],
  providers: [OACategoryService],
  exports: [OACategoryService, TypeOrmModule]
})
export class OACategoryModule {}
