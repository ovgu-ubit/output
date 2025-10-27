import { Body, Controller, Get, InternalServerErrorException, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBody, ApiTags } from "@nestjs/swagger";
import { GreaterEntityService } from "./greater-entitiy.service";
import { GreaterEntityIndex } from "../../../output-interfaces/PublicationIndex";
import { AccessGuard } from "../authorization/access.guard";
import { Permissions } from "../authorization/permission.decorator";
import { GreaterEntity } from "./GreaterEntity.entity";
import { AbstractCrudController } from "../common/abstract-crud.controller";

@Controller("greater_entity")
@ApiTags("greater_entity")
export class GreaterEntityController extends AbstractCrudController<GreaterEntity, GreaterEntityService> {

    constructor(geService:GreaterEntityService) {
        super(geService);
    }

    protected override updateEntity(body: GreaterEntity) {
        return this.service.update(body);
    }

    @Get("index")
    async index(@Query('reporting_year') reporting_year:number) : Promise<GreaterEntityIndex[]> {
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
    async combine(@Body('id1') id1: number, @Body('ids') ids: number[]) {
        let res = await this.service.combine(id1,ids);
        if (res['error'] && res['error'] === 'update') throw new InternalServerErrorException('Problems while updating first publisher') 
        else if (res['error'] && res['error'] === 'delete') throw new InternalServerErrorException('Problems while deleting second publisher') 
        else return res;
    }
}
