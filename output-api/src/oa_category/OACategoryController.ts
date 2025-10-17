import { Body, Controller, Delete, Get, InternalServerErrorException, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { OACategoryIndex } from "../../../output-interfaces/PublicationIndex";
import { AccessGuard } from "../authorization/access.guard";
import { Permissions } from "../authorization/permission.decorator";
import { PublicationType } from "../entity/PublicationType";
import { OACategoryService } from "./oa-category.service";
import { OA_Category } from "./OA_Category";

@Controller("oa_cat")
@ApiTags("oa_cat")
export class OACategoryController {

    constructor(private oaService:OACategoryService) { }
    
    @Get()
    @ApiResponse({
        type: PublicationType,
        isArray: true
    })
    async all() : Promise<OA_Category[]> {
        return await this.oaService.get();
    }

    @Get('one')
    @UseGuards(AccessGuard)
    @ApiResponse({
        type: OA_Category
    })
    async one(@Query('id') id:number, @Req() request: Request) : Promise<OA_Category> {
        return await this.oaService.one(id, request['user']? request['user']['write'] : false);
    }

    @Get("index")
    async index(@Query('reporting_year') reporting_year:number) : Promise<OACategoryIndex[]> {
        return await this.oaService.index(reporting_year);
    }


    @Post()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    @ApiBody({
        description: '<p>JSON Request:</p>',
        schema: {
            example: {
                label: 'Label'
            }
        }
    })
    async save(@Body() body: OA_Category) {
        if (!body.id) body.id = undefined;
        return this.oaService.save([body])
    }
    
    @Put()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    @ApiBody({
        description: '<p>JSON Request:</p>',
        schema: {
            example: {
                label: 'Label'
            }
        }
    })
    async update(@Body() body: OA_Category) {
        return this.oaService.save([body])
    }

    @Delete()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    async remove(@Body() body: OA_Category[]) {
        return this.oaService.delete(body);
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
        let res = await this.oaService.combine(id1,ids);
        if (res['error'] && res['error'] === 'update') throw new InternalServerErrorException('Problems while updating first publisher') 
        else if (res['error'] && res['error'] === 'delete') throw new InternalServerErrorException('Problems while deleting second publisher') 
        else return res;
    }

    
}
