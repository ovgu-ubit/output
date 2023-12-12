import { Request } from "express";
import { Author } from "../entity/Author";
import { InjectRepository } from "@nestjs/typeorm";
import { Body, Controller, Delete, Get, InternalServerErrorException, Param, Post, Put, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ApiBody, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthorService } from "../services/entities/author.service";
import { Permissions } from "../guards/permission.decorator";
import { AccessGuard } from "../guards/access.guard";

@Controller("authors")
@ApiTags("authors")
export class AuthorController {

    constructor(@InjectRepository(Author) private userRepository, private authorService: AuthorService) { }

    @Get()
    @ApiResponse({ status: 200, description: 'Author objects are returned.' })
    async all(@Req() request: Request) {
        let prom;
        if (request.query.orcid) prom = this.userRepository.find({ where: { orcid: request.query.orcid } });
        else if (request.query.given && request.query.family) prom = this.userRepository.find({ where: { given: request.query.given, family: request.query.family } });
        else prom = this.userRepository.find();
        return await prom.catch(err => {
            throw new InternalServerErrorException('Failure while selecting')
        })
    }

    @Get('index')
    @ApiResponse({ status: 200, description: 'Author index is returned.' })
    async index(@Query('reporting_year') reporting_year:number) {
        return await this.authorService.index(reporting_year);
    }

    @Get('/:id')
    @ApiParam({ name: 'id', description: 'id for which author object should be obtained' })
    async one(@Param('id') id:number) {
        return this.authorService.one(id);
    }

    @Post()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }])
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
        return this.userRepository.save(request.body);
    }

    @Put()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }])
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
        return this.userRepository.save([author])
    }

    @Delete()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }])
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
    @Permissions([{ role: 'writer', app: 'output' }])
    async combine(@Body('id1') id1: number, @Body('ids') ids: number[]) {
        let res = await this.authorService.combineAuthors(id1,ids);
        if (res['error'] && res['error'] === 'update') throw new InternalServerErrorException('Problems while updating first author') 
        else if (res['error'] && res['error'] === 'delete') throw new InternalServerErrorException('Problems while deleting other authors') 
        else return res;
    }
}
