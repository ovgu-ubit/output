import { Body, Controller, Delete, Get, InternalServerErrorException, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { PublicationTypeService } from "../services/entities/publication-type.service";
import { AppConfigService } from "../services/app-config.service";
import { PublicationType } from "../entity/PublicationType";
import { PublicationTypeIndex } from "../../../output-interfaces/PublicationIndex";
import { AccessGuard } from "../guards/access.guard";
import { Permissions } from "../guards/permission.decorator";

@Controller("pub_type")
@ApiTags("pub_type")
export class PublicationTypeController {

    constructor(private pubTypeService:PublicationTypeService,
    private configService:AppConfigService) { }
    
    @Get()
    @ApiResponse({
        type: PublicationType,
        isArray: true
    })
    async all() : Promise<PublicationType[]> {
        return await this.pubTypeService.get();
    }

    @Get('one')
    @ApiResponse({
        type: PublicationType
    })
    async one(@Query('id') id:number) : Promise<PublicationType> {
        return await this.pubTypeService.one(id);
    }

    @Get("index")
    async index(@Query('reporting_year') reporting_year:number) : Promise<PublicationTypeIndex[]> {
        return await this.pubTypeService.index(reporting_year);
    }


    @Post()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }])
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
    @Permissions([{ role: 'writer', app: 'output' }])
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
    @Permissions([{ role: 'writer', app: 'output' }])
    async remove(@Body() body: PublicationType[]) {
        return this.pubTypeService.delete(body);
    }

    @Post('combine')
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }])
    @ApiBody({
        schema: {
            example: {
                id1: 4,
                id2: 6
            }
        }
    })
    async combine(@Body('id1') id1: number, @Body('ids') ids: number[]) {
        let res = await this.pubTypeService.combine(id1,ids);
        if (res['error'] && res['error'] === 'update') throw new InternalServerErrorException('Problems while updating first publisher') 
        else if (res['error'] && res['error'] === 'delete') throw new InternalServerErrorException('Problems while deleting second publisher') 
        else return res;
    }

    
}
