import { ApiResponse } from '@nestjs/swagger';
import { ReportingYearIndexPageRequestDto, IndexPageDto } from '../common/dto/index-page.dto';
import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBody, ApiTags } from "@nestjs/swagger";
import {  FunderIndex  } from '@output/interfaces';
import { AccessGuard } from "../authorization/access.guard";
import { Permissions } from "../authorization/permission.decorator";
import { Funder } from "./Funder.entity";
import { FunderService } from "./funder.service";
import { AbstractCrudController } from "../common/abstract-crud.controller";

@Controller("funder")
@ApiTags("funder")
export class FunderController extends AbstractCrudController<Funder, FunderService> {

    constructor(funderService: FunderService) {
        super(funderService);
    }

    @Post('index-page')
    @UseGuards(AccessGuard)
    @ApiResponse({ status: 201, type: IndexPageDto, description: 'Filtered, sorted index page. The reporting year scopes aggregate values.' })
    indexPage(@Body() body: ReportingYearIndexPageRequestDto) {
        return this.service.indexPage(body);
    }

    @Get("index")
    async index(@Query('reporting_year') reporting_year:number) : Promise<FunderIndex[]> {
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
    async combine(@Body('id1') id1: number, @Body('ids') ids: number[], @Body('aliases') aliases?:string[]) {
        return this.service.combine(id1,ids,aliases);
    }

}
