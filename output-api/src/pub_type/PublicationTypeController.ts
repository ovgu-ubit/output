import { Body, Controller, Delete, Get, InternalServerErrorException, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { PublicationTypeService } from "./publication-type.service";
import { PublicationTypeIndex } from "../../../output-interfaces/PublicationIndex";
import { AccessGuard } from "../authorization/access.guard";
import { Permissions } from "../authorization/permission.decorator";
import { PublicationType } from "./PublicationType";

@Controller("pub_type")
@ApiTags("pub_type")
export class PublicationTypeController {

    constructor(private pubTypeService:PublicationTypeService) { }
    
    @Get()
    @ApiResponse({
        type: PublicationType,
        isArray: true
    })
    async all() : Promise<PublicationType[]> {
        return await this.pubTypeService.get();
    }

    @Get('one')
    @UseGuards(AccessGuard)
    @ApiResponse({
        type: PublicationType
    })
    async one(@Query('id') id:number, @Req() request: Request) : Promise<PublicationType> {
        return await this.pubTypeService.one(id, request['user']? request['user']['write'] : false);
    }

    @Get("index")
    async index(@Query('reporting_year') reporting_year:number) : Promise<PublicationTypeIndex[]> {
        return await this.pubTypeService.index(reporting_year);
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
    async save(@Body() body: PublicationType) {
        if (!body.id) body.id = undefined;
        return this.pubTypeService.save([body])
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
    async update(@Body() body: PublicationType) {
        return this.pubTypeService.save([body])
    }

    @Delete()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    async remove(@Body() body: PublicationType[]) {
        return this.pubTypeService.delete(body);
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
        let res = await this.pubTypeService.combine(id1,ids, aliases);
        if (res['error'] && res['error'] === 'update') throw new InternalServerErrorException('Problems while updating first publisher') 
        else if (res['error'] && res['error'] === 'delete') throw new InternalServerErrorException('Problems while deleting second publisher') 
        else return res;
    }

    
}
