import { Body, Controller, Delete, Get, Post, Put, Query, Param, UseGuards, Req } from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { InstituteService } from "./institute.service";
import { InstituteIndex } from "../../../output-interfaces/PublicationIndex";
import { Institute } from "./Institute.entity";
import { AccessGuard } from "../authorization/access.guard";
import { Permissions } from "../authorization/permission.decorator";
import { createNotFoundHttpException } from "../common/api-error";
import { assertCreateRequestHasNoId } from "../common/entity-id";

@Controller("institute")
@ApiTags("institute")
export class InstituteController {

    constructor(private instService: InstituteService) { }

    @Get()
    @UseGuards(AccessGuard)
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
        const institute = await this.instService.one(id, request['user']? request['user']['write'] : false, request['user']?.['username']);
        if (!institute) throw createNotFoundHttpException('Institute not found.');
        return institute;
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
    async save(@Body() body: Institute, @Req() request: Request) {
        assertCreateRequestHasNoId(body);
        return this.instService.save([body], request['user']?.['username'])
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
    async update(@Body() body: Institute, @Req() request: Request) {
        return this.instService.save([body], request['user']?.['username'])
    }

    @Delete()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    async remove(@Body() body: Institute[]) {
        return this.instService.delete(body);
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
        return this.instService.combine(id1, ids, aliases);
    }

    @Get('subs/:id')
    @UseGuards(AccessGuard)
    @ApiResponse({
        type: Number,
        isArray: true
    })
    async subs(@Param('id') id: number) {
        return (await this.instService.findSubInstitutesFlat(id)).map(e => e.id);
    }
}
