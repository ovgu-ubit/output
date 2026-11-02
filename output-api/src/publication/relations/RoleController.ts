import { Body, Post, UseGuards } from '@nestjs/common';
import { AccessGuard } from '../../authorization/access.guard';
import { ApiResponse } from '@nestjs/swagger';
import { ReportingYearIndexPageRequestDto, IndexPageDto } from '../../common/dto/index-page.dto';
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AbstractCrudController } from "../../common/abstract-crud.controller";
import { Role } from "./Role.entity";
import { RoleService } from "./role.service";

@Controller("role")
@ApiTags("role")
export class RoleController extends AbstractCrudController<Role, RoleService> {
    constructor(roleService: RoleService) {
        super(roleService);
    }

    @Post('index-page')
    @UseGuards(AccessGuard)
    @ApiResponse({ status: 201, type: IndexPageDto, description: 'Filtered, sorted index page. The reporting year scopes aggregate values.' })
    indexPage(@Body() body: ReportingYearIndexPageRequestDto) {
        return this.service.indexPage(body);
    }
}
