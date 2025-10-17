import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { PublicationModule } from '../publication/publication.module';
import { OA_Category } from './OA_Category';
import { OACategoryController } from './OACategoryController';
import { OACategoryService } from './oa-category.service';

@Module({
  imports: [TypeOrmModule.forFeature([OA_Category]), PublicationModule, AuthorizationModule],
  controllers: [OACategoryController],
  providers: [OACategoryService],
  exports: [OACategoryService, TypeOrmModule]
})
export class OACategoryModule {}
