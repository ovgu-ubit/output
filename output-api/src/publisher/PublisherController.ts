import { ApiResponse } from '@nestjs/swagger';
import { ReportingYearIndexPageRequestDto, IndexPageDto } from '../common/dto/index-page.dto';
import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { ApiBody, ApiTags } from "@nestjs/swagger";
import { Publisher } from "./Publisher.entity";
import {  PublisherIndex  } from '@output/interfaces';
import { Permissions } from "../authorization/permission.decorator";
import { AccessGuard } from "../authorization/access.guard";
import { PublisherService } from "./publisher.service";
import { AbstractCrudController } from "../common/abstract-crud.controller";

@Controller("publisher")
@ApiTags("publisher")
export class PublisherController extends AbstractCrudController<Publisher, PublisherService> {

    constructor(publisherService:PublisherService) {
        super(publisherService);
    }

    @Post('index-page')
    @UseGuards(AccessGuard)
    @ApiResponse({ status: 201, type: IndexPageDto, description: 'Filtered, sorted index page. The reporting year scopes aggregate values.' })
    indexPage(@Body() body: ReportingYearIndexPageRequestDto) {
        return this.service.indexPage(body);
    }

    @Get("index")
    async index(@Query('reporting_year') reporting_year:number) : Promise<PublisherIndex[]> {
        return await this.service.index(reporting_year);
    }

    @Post('combine')
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    @ApiBody({
        schema: {
            example: {
                id1: 4,
                id2: 6
            }
        }
    })
    async combine(@Body('id1') id1: number, @Body('ids') ids: number[], @Body('aliases') aliases?:string[], @Req() request?: Request) {
        return this.service.combine(id1, ids, aliases, request?.['user']?.['username']);
    }
}
