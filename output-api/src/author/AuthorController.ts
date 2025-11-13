import { Request } from "express";
import { Author } from "./Author.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Body, Controller, Delete, Get, InternalServerErrorException, Param, Post, Put, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ApiBody, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthorService } from "./author.service";
import { Permissions } from "../authorization/permission.decorator";
import { AccessGuard } from "../authorization/access.guard";

@Controller("authors")
@ApiTags("authors")
export class AuthorController {

    constructor(@InjectRepository(Author) private userRepository, private authorService: AuthorService) { }

    @Get()
    @UseGuards(AccessGuard)
    @ApiResponse({ status: 200, description: 'Author objects are returned.' })
    async all() {
        return this.authorService.get();
    }

    @Get('index')
    @ApiResponse({ status: 200, description: 'Author index is returned.' })
    async index(@Query('reporting_year') reporting_year: number) {
        return await this.authorService.index(reporting_year);
    }

    @Get('/:id')
    @UseGuards(AccessGuard)
    @ApiParam({ name: 'id', description: 'id for which author object should be obtained' })
    async one(@Param('id') id: number, @Req() request: Request) {
        return this.authorService.one(id, request['user'] ? request['user']['write'] : false);
    }

    @Post()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    @ApiBody({
        schema: {
            example: {
                first_name: 'Max',
                last_name: 'Mustermann'
            }
        }
    })
    @ApiResponse({ status: 201, description: 'Saved objects are returned.' })
    async save(@Req() request: Request) {
        return this.authorService.save([request.body]);
    }

    @Put()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    @ApiBody({
        schema: {
            example: {
                id: 4,
                given: 'Max',
                family: 'Mustermann'
            }
        }
    })
    async update(@Body() author: Author) {
        return this.authorService.save([author])
    }

    @Delete()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    async remove(@Body() body: Author[]) {
        return this.authorService.delete(body);
    }

    @Post('combine')
    @ApiBody({
        schema: {
            example: {
                id1: 4,
                ids: [
                    6
                ]
            }
        }
    })
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    async combine(@Body('id1') id1: number, @Body('ids') ids: number[], @Body('aliases_first_name') aliases_first_name?: string[], @Body('aliases_last_name') aliases_last_name?: string[]) {
        let res = await this.authorService.combineAuthors(id1, ids, aliases_first_name, aliases_last_name);
        if (res['error'] && res['error'] === 'update') throw new InternalServerErrorException('Problems while updating first author')
        else if (res['error'] && res['error'] === 'delete') throw new InternalServerErrorException('Problems while deleting other authors')
        else return res;
    }
}
