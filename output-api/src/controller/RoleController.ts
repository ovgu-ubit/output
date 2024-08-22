import { Body, Controller, Delete, Get, InternalServerErrorException, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { GreaterEntityService } from "../services/entities/greater-entitiy.service";
import { GreaterEntity } from "../entity/GreaterEntity";
import { GreaterEntityIndex } from "../../../output-interfaces/PublicationIndex";
import { AccessGuard } from "../guards/access.guard";
import { Permissions } from "../guards/permission.decorator";
import { RoleService } from "../services/entities/role.service";
import { Role } from "../entity/Role";

@Controller("role")
@ApiTags("role")
export class RoleController {

    constructor(private roleService:RoleService) { }

    @Get()
    @ApiResponse({
        type: Role,
        isArray: true
    })
    async all() : Promise<Role[]> {
        return await this.roleService.get();
    }

    @Get('one')
    @UseGuards(AccessGuard)
    @ApiResponse({
        type: Role
    })
    async one(@Query('id') id:number, @Req() request: Request) : Promise<Role> {
        return await this.roleService.one(id,request['user']? request['user']['write'] : false);
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
    async save(@Body() body: Role) {
        return this.roleService.save([body])
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
    async update(@Body() body: Role) {
        return this.roleService.save([body])
    }

    @Delete()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    async remove(@Body() body: Role[]) {
        return this.roleService.delete(body);
    }
}
