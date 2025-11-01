import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppConfigModule } from "../../config/app-config.module";
import { AuthorPublication } from "./AuthorPublication.entity";
import { Role } from "./Role.entity";
import { RoleController } from "./RoleController";
import { RoleService } from "./role.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
          AuthorPublication,
          Role
        ]),
    AppConfigModule
  ],
  controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleService, TypeOrmModule]
})
export class PublicationRelationsModule { }
