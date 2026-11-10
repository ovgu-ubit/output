import { ApiResponse } from '@nestjs/swagger';
import { ReportingYearIndexPageRequestDto, IndexPageDto } from '../common/dto/index-page.dto';
import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBody, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { PublicationTypeService } from "./publication-type.service";
import {  PublicationTypeIndex  } from '@output/interfaces';
import { AccessGuard } from "../authorization/access.guard";
import { Permissions } from "../authorization/permission.decorator";
import { PublicationType } from "./PublicationType.entity";
import { AbstractCrudController } from "../common/abstract-crud.controller";

@Controller("pub_type")
@ApiTags("pub_type")
export class PublicationTypeController extends AbstractCrudController<PublicationType, PublicationTypeService> {

    constructor(pubTypeService:PublicationTypeService) {
        super(pubTypeService);
    }

    @Post('index-page')
    @UseGuards(AccessGuard)
    @ApiResponse({ status: 201, type: IndexPageDto, description: 'Filtered, sorted index page. The reporting year scopes aggregate values.' })
    indexPage(@Body() body: ReportingYearIndexPageRequestDto, @Req() request: Request) {
        return this.service.indexPage(body, !!request?.['user']?.['read']);
    }

    @Get("index")
    @UseGuards(AccessGuard)
    async index(@Query('reporting_year') reporting_year:number, @Req() request: Request) : Promise<PublicationTypeIndex[]> {
        return await this.service.index(reporting_year, request['user'] ? request['user']['read'] : false);
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
