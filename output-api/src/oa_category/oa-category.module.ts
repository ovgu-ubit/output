import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../config/app-config.module';
import { PublicationModule } from '../publication/publication.module';
import { OACategoryService } from './oa-category.service';
import { OA_Category } from './OA_Category.entity';
import { OACategoryController } from './OACategoryController';

@Module({
  imports: [
    TypeOrmModule.forFeature([OA_Category]), 
    PublicationModule, 
    AppConfigModule
  ],
  controllers: [OACategoryController],
  providers: [OACategoryService],
  exports: [OACategoryService, TypeOrmModule]
})
export class OACategoryModule {}
