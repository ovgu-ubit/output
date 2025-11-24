import { Body, Controller, Get, InternalServerErrorException, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBody, ApiTags } from "@nestjs/swagger";
import { PublicationTypeService } from "./publication-type.service";
import { PublicationTypeIndex } from "../../../output-interfaces/PublicationIndex";
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

    @Get("index")
    async index(@Query('reporting_year') reporting_year:number) : Promise<PublicationTypeIndex[]> {
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
        const res = await this.service.combine(id1,ids, aliases);
        if (res['error'] && res['error'] === 'update') throw new InternalServerErrorException('Problems while updating first publisher') 
        else if (res['error'] && res['error'] === 'delete') throw new InternalServerErrorException('Problems while deleting second publisher') 
        else return res;
    }

    
}
