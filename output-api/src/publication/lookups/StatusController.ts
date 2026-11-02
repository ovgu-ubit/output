import { Body, Post, UseGuards } from '@nestjs/common';
import { AccessGuard } from '../../authorization/access.guard';
import { ApiResponse } from '@nestjs/swagger';
import { ReportingYearIndexPageRequestDto, IndexPageDto } from '../../common/dto/index-page.dto';
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AbstractCrudController } from "../../common/abstract-crud.controller";
import { Status } from "./Status.entity";
import { StatusService } from "./status.service";

@Controller("status")
@ApiTags("status")
export class StatusController extends AbstractCrudController<Status, StatusService> {
    constructor(statusService: StatusService) {
        super(statusService);
    }

    @Post('index-page')
    @UseGuards(AccessGuard)
    @ApiResponse({ status: 201, type: IndexPageDto, description: 'Filtered, sorted index page. The reporting year scopes aggregate values.' })
    indexPage(@Body() body: ReportingYearIndexPageRequestDto) {
        return this.service.indexPage(body);
    }

    protected override normalizeBodyForCreate(body: Status): Status {
        return this.service.normalizeForCreate(body);
    }

    protected override createEntity(body: Status) {
        return this.service.create(body);
    }
}
