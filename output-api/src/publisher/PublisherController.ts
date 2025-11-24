import { Body, Controller, Get, InternalServerErrorException, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBody, ApiTags } from "@nestjs/swagger";
import { Publisher } from "./Publisher.entity";
import { PublisherIndex } from "../../../output-interfaces/PublicationIndex";
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
    async combine(@Body('id1') id1: number, @Body('ids') ids: number[], @Body('aliases') aliases?:string[]) {
        const res = await this.service.combine(id1,ids,aliases);
        if (res['error'] && res['error'] === 'update') throw new InternalServerErrorException('Problems while updating first publisher')
        else if (res['error'] && res['error'] === 'delete') throw new InternalServerErrorException('Problems while deleting second publisher')
        else return res;
    }
}

