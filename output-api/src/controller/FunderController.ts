import { Body, Controller, Delete, Get, InternalServerErrorException, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBody, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { FunderService } from "../services/entities/funder.service";
import { Funder } from "../entity/Funder";
import { FunderIndex } from "../../../output-interfaces/PublicationIndex";
import { AccessGuard } from "../guards/access.guard";
import { Permissions } from "../guards/permission.decorator";

@Controller("funder")
@ApiTags("funder")
export class FunderController {

    constructor(private funderService:FunderService) { }

    @Get()
    @ApiResponse({
        type: Funder,
        isArray: true
    })
    async all() : Promise<Funder[]> {
        return await this.funderService.get();
    }

    @Get('one')
    @UseGuards(AccessGuard)
    @ApiResponse({
        type: Funder
    })
    async one(@Query('id') id:number, @Req() request: Request) : Promise<Funder> {
        return await this.funderService.one(id, request['user']? request['user']['write'] : false);
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
    async save(@Body() body: Funder) {
        if (!body.id) body.id = undefined;
        return this.funderService.save([body])
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
    async update(@Body() body: Funder) {
        return this.funderService.save([body])
    }

    @Get("index")
    async index(@Query('reporting_year') reporting_year:number) : Promise<FunderIndex[]> {
        return await this.funderService.index(reporting_year);
    }

    @Delete()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    async remove(@Body() body: Funder[]) {
        return this.funderService.delete(body);
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
        let res = await this.funderService.combine(id1,ids,aliases);
        if (res['error'] && res['error'] === 'update') throw new InternalServerErrorException('Problems while updating first funder') 
        else if (res['error'] && res['error'] === 'delete') throw new InternalServerErrorException('Problems while deleting second funder') 
        else return res;
    }

}
