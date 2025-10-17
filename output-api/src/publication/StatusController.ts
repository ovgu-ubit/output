import { Body, Controller, Delete, Get, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Role } from "./Role";
import { Status } from "./Status";
import { Permissions } from "../authorization/permission.decorator";
import { StatusService } from "../publication/status.service";
import { AccessGuard } from "../authorization/access.guard";

@Controller("status")
@ApiTags("status")
export class StatusController {

    constructor(private statusService:StatusService) { }

    @Get()
    @ApiResponse({
        type: Role,
        isArray: true
    })
    async all() : Promise<Status[]> {
        return await this.statusService.get();
    }

    @Get('one')
    @UseGuards(AccessGuard)
    @ApiResponse({
        type: Role
    })
    async one(@Query('id') id:number, @Req() request: Request) : Promise<Status> {
        return await this.statusService.one(id,request['user']? request['user']['write'] : false);
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
    async save(@Body() body: Status) {
        return this.statusService.save([body])
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
    async update(@Body() body: Status) {
        return this.statusService.save([body])
    }

    @Delete()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    async remove(@Body() body: Status[]) {
        return this.statusService.delete(body);
    }
}
