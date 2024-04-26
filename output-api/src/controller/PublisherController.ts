import { Body, Controller, Delete, Get, InternalServerErrorException, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { PublisherService } from "../services/entities/publisher.service";
import { Publisher } from "../entity/Publisher";
import { PublisherIndex } from "../../../output-interfaces/PublicationIndex";
import { AccessGuard } from "../guards/access.guard";
import { Permissions } from "../guards/permission.decorator";

@Controller("publisher")
@ApiTags("publisher")
export class PublisherController {

    constructor(private publisherService:PublisherService) { }

    @Get()
    @ApiResponse({
        type: Publisher,
        isArray: true
    })
    async all() : Promise<Publisher[]> {
        return await this.publisherService.get();
    }

    @Get('one')
    @UseGuards(AccessGuard)
    @ApiResponse({
        type: Publisher
    })
    async one(@Query('id') id:number, @Req() request: Request) : Promise<Publisher> {
        return await this.publisherService.one(id, request['user']? request['user']['write'] : false);
    }

    @Get("index")
    async index(@Query('reporting_year') reporting_year:number) : Promise<PublisherIndex[]> {
        return await this.publisherService.index(reporting_year);
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
    async save(@Body() body: Publisher) {
        if (!body.id) body.id = undefined;
        return this.publisherService.save([body])
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
    async update(@Body() body: Publisher) {
        return this.publisherService.save([body])
    }

    @Delete()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    async remove(@Body() body: Publisher[]) {
        return this.publisherService.delete(body);
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
        let res = await this.publisherService.combine(id1,ids,aliases);
        if (res['error'] && res['error'] === 'update') throw new InternalServerErrorException('Problems while updating first publisher') 
        else if (res['error'] && res['error'] === 'delete') throw new InternalServerErrorException('Problems while deleting second publisher') 
        else return res;
    }
}
