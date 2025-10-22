import { Body, Controller, Get, InternalServerErrorException, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBody, ApiTags } from "@nestjs/swagger";
import { FunderIndex } from "../../../output-interfaces/PublicationIndex";
import { AccessGuard } from "../authorization/access.guard";
import { Permissions } from "../authorization/permission.decorator";
import { Funder } from "./Funder";
import { FunderService } from "./funder.service";
import { AbstractCrudController } from "../common/abstract-crud.controller";

@Controller("funder")
@ApiTags("funder")
export class FunderController extends AbstractCrudController<Funder, FunderService> {

    constructor(funderService: FunderService) {
        super(funderService);
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
        let res = await this.service.combine(id1,ids,aliases);
        if (res['error'] && res['error'] === 'update') throw new InternalServerErrorException('Problems while updating first funder') 
        else if (res['error'] && res['error'] === 'delete') throw new InternalServerErrorException('Problems while deleting second funder') 
        else return res;
    }

}
