import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Author } from './Author';
import { AuthorController } from './AuthorController';
import { AuthorService } from './author.service';

@Module({
  imports: [TypeOrmModule.forFeature([Author])],
  controllers: [AuthorController],
  providers: [AuthorService],
  exports: [AuthorService, TypeOrmModule]
})
export class AuthorModule {}
