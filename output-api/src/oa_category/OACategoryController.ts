import { Body, Controller, Get, InternalServerErrorException, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBody, ApiTags } from "@nestjs/swagger";
import { OACategoryIndex } from "../../../output-interfaces/PublicationIndex";
import { AccessGuard } from "../authorization/access.guard";
import { Permissions } from "../authorization/permission.decorator";
import { OACategoryService } from "./oa-category.service";
import { OA_Category } from "./OA_Category.entity";
import { AbstractCrudController } from "../common/abstract-crud.controller";

@Controller("oa_cat")
@ApiTags("oa_cat")
export class OACategoryController extends AbstractCrudController<OA_Category, OACategoryService> {

    constructor(oaService:OACategoryService) {
        super(oaService);
    }

    @Get("index")
    async index(@Query('reporting_year') reporting_year:number) : Promise<OACategoryIndex[]> {
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
