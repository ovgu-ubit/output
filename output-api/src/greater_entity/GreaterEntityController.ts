import { Body, Controller, Delete, Get, InternalServerErrorException, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { GreaterEntityService } from "../services/entities/greater-entitiy.service";
import { GreaterEntityIndex } from "../../../output-interfaces/PublicationIndex";
import { AccessGuard } from "../authorization/access.guard";
import { Permissions } from "../authorization/permission.decorator";
import { GreaterEntity } from "./GreaterEntity";

@Controller("greater_entity")
@ApiTags("greater_entity")
export class GreaterEntityController {

    constructor(private geService:GreaterEntityService) { }

    @Get()
    @ApiResponse({
        type: GreaterEntity,
        isArray: true
    })
    async all() : Promise<GreaterEntity[]> {
        return await this.geService.get();
    }

    @Get('one')
    @UseGuards(AccessGuard)
    @ApiResponse({
        type: GreaterEntity
    })
    async one(@Query('id') id:number, @Req() request: Request) : Promise<GreaterEntity> {
        return await this.geService.one(id, request['user']? request['user']['write'] : false);
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
    async save(@Body() body: GreaterEntity) {
        return this.geService.save([body])
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
    async update(@Body() body: GreaterEntity) {
        return this.geService.update(body)
    }

    
    @Get("index")
    async index(@Query('reporting_year') reporting_year:number) : Promise<GreaterEntityIndex[]> {
        return await this.geService.index(reporting_year);
    }

    @Delete()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    async remove(@Body() body: GreaterEntity[]) {
        return this.geService.delete(body);
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
        let res = await this.geService.combine(id1,ids);
        if (res['error'] && res['error'] === 'update') throw new InternalServerErrorException('Problems while updating first publisher') 
        else if (res['error'] && res['error'] === 'delete') throw new InternalServerErrorException('Problems while deleting second publisher') 
        else return res;
    }
}
