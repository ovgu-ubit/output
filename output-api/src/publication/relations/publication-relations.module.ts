import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RoleController } from "./RoleController";
import { RoleService } from "./role.service";
import { AuthorizationModule } from "../../authorization/authorization.module";
import { Role } from "./Role";
import { AuthorPublication } from "./AuthorPublication";
import { AppConfigModule } from "../../config/app-config.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
          AuthorPublication,
          Role
        ])
    , AuthorizationModule,
    AppConfigModule
  ],
  controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleService, TypeOrmModule]
})
export class PublicationRelationsModule { }
