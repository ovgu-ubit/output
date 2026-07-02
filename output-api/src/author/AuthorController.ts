import { Request } from "express";
import { Author } from "./Author.entity";
import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBody, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthorService } from "./author.service";
import { Permissions } from "../authorization/permission.decorator";
import { AccessGuard } from "../authorization/access.guard";
import { AbstractCrudController } from "../common/abstract-crud.controller";

@Controller("authors")
@ApiTags("authors")
export class AuthorController extends AbstractCrudController<Author, AuthorService> {

    constructor(authorService: AuthorService) {
        super(authorService);
    }

    @Get('index')
    @ApiResponse({ status: 200, description: 'Author index is returned.' })
    async index(@Query('reporting_year') reporting_year: number) {
        return await this.service.index(reporting_year);
    }

    @Get('/:id')
    @UseGuards(AccessGuard)
    @ApiParam({ name: 'id', description: 'id for which author object should be obtained' })
    async one(@Param('id') id: number, @Req() request: Request) {
        return this.service.oneOrFail(
            id,
            this.getAccessScope(request),
            'Author not found.',
        );
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
        return this.service.combineAuthors(id1, ids, aliases_first_name, aliases_last_name);
    }
}
