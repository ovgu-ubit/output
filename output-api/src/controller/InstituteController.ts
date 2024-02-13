import { Body, Controller, Delete, Get, InternalServerErrorException, Post, Put, Query, Param, UseGuards, Req } from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { InstitutionService } from "../services/entities/institution.service";
import { Institute } from "../entity/Institute";
import { InstituteIndex } from "../../../output-interfaces/PublicationIndex";
import { AccessGuard } from "../guards/access.guard";
import { Permissions } from "../guards/permission.decorator";

@Controller("institute")
@ApiTags("institute")
export class InstituteController {

    constructor(private instService: InstitutionService) { }

    @Get()
    @ApiResponse({
        type: Institute,
        isArray: true
    })
    async all(): Promise<Institute[]> {
        return await this.instService.get();
    }

    @Get("index")
    async index(@Query('reporting_year') reporting_year: number): Promise<InstituteIndex[]> {
        return await this.instService.index(reporting_year);
    }

    @Get('/:id')
    @UseGuards(AccessGuard)
    @ApiResponse({
        type: Institute
    })
    async one(@Param('id') id: number, @Req() request: Request): Promise<Institute> {
        return await this.instService.one(id, request['user']? request['user']['write'] : false);
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
    async save(@Body() body: Institute) {
        return this.instService.save([body])
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
    async update(@Body() body: Institute) {
        return this.instService.save([body])
    }

    @Delete()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }])
    async remove(@Body() body: Institute[]) {
        return this.instService.delete(body);
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
    async combine(@Body('id1') id1: number, @Body('ids') ids: number[], @Body('aliases') aliases?:string[]) {
        let res = await this.instService.combine(id1, ids, aliases);
        if (res['error'] && res['error'] === 'update') throw new InternalServerErrorException('Problems while updating first author')
        else if (res['error'] && res['error'] === 'delete') throw new InternalServerErrorException('Problems while deleting second author')
        else return res;
    }

    @Get('subs/:id')
    @ApiResponse({
        type: Number,
        isArray: true
    })
    async subs(@Param('id') id: number) {
        return (await this.instService.findSubInstitutesFlat(id)).map(e => e.id);
    }
}
