import { Body, Controller, Delete, Get, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBody, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { SearchFilter } from "../../../../output-interfaces/Config";
import { PublicationIndex } from "../../../../output-interfaces/PublicationIndex";
import { Publication } from "./Publication.entity";
import { Permissions } from "../../authorization/permission.decorator";
import { PublicationFilterService } from "./publication-filter.service";
import { PublicationService } from "./publication.service";
import { PublicationDuplicate } from "./PublicationDuplicate.entity";
import { AccessGuard } from "../../authorization/access.guard";
import { assertCreateRequestHasNoId } from "../../common/entity-id";

@Controller("publications")
@ApiTags("publications")
export class PublicationController {

    constructor(
        private publicationService: PublicationService,
        private publicationFilterService: PublicationFilterService,
    ) { }

    @Get()
    @UseGuards(AccessGuard)
    @ApiQuery({
        name: 'yop',
        type: 'integer',
        required: true,
        description: 'The YOP that should be reported.',
        example: "2022"
    })
    @ApiResponse({
        type: Publication,
        isArray: true
    })
    all(@Query('yop') yop: number, @Req() request: Request) {
        return this.publicationService.getAllForReportingYear(yop, request['user'] ? request['user']['read'] : false);
    }

    @Get('one')
    @UseGuards(AccessGuard)
    @ApiQuery({
        name: 'id',
        type: 'integer',
        required: true,
        description: 'Publication ID',
        example: "3"
    })
    @ApiResponse({
        type: Publication
    })
    async one(@Query('id') id: number, @Req() request: Request) {
        return this.publicationService.getPublicationOrFail(
            id,
            request['user'] ? request['user']['read'] : false,
            request['user'] ? request['user']['write_publication'] : false,
            request['user']?.['username'],
        );
    }

    @Get('changes')
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'reader', app: 'output' }, { role: 'publication_writer', app: 'output' }, { role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    @ApiQuery({
        name: 'id',
        type: 'integer',
        required: true,
        description: 'Publication ID',
        example: "3"
    })
    async changes(@Query('id') id: number) {
        return this.publicationService.getPublicationChanges(id);
    }

    @Get('publicationIndex')
    @ApiQuery({
        name: 'yop',
        type: 'integer',
        required: true,
        description: 'The YOP that should be reported.',
        example: "2022"
    })
    async index(@Query('yop') yop: number, @Query('soft') soft?: boolean): Promise<PublicationIndex[]> {
        return this.publicationService.getIndexEntries(yop, soft);
    }

    @Post()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'publication_writer', app: 'output' }, { role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    @ApiBody({
        description: '<p>JSON Request:</p>',
        schema: {
            example: {
                title: 'Bla bla',
                authors: 'C. Schulz, S. Bosse, M. Kempka',
                doi: '12341',
                pub_date: new Date(2021, 1),
                dataSource: 'created',
            }
        }
    })
    async save(@Body() body: Publication, @Req() request: Request) {
        assertCreateRequestHasNoId(body);
        return this.publicationService.saveOne(body, request['user']?.['username']);
    }

    @Put()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'publication_writer', app: 'output' }, { role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    async update(@Body() body: Publication[] | Publication, @Req() request: Request) {
        return this.publicationService.updateEntries(body, request['user']?.['username']);
    }

    @Delete()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'publication_writer', app: 'output' }, { role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    async remove(@Body('publications') publications: Publication[], @Body('soft') soft?: boolean) {
        return this.publicationService.delete(publications, soft);
    }

    @Get('reporting_year')
    getReportingYear() {
        return this.publicationService.getReportingYears();
    }

    @Post('combine')
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'publication_writer', app: 'output' }, { role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    @ApiBody({
        schema: {
            example: {
                id1: 4,
                id2: 6
            }
        }
    })
    async combine(@Body('id1') id1: number, @Body('ids') ids: number[]) {
        return this.publicationService.combine(id1, ids);
    }

    @Post('filter')
    @ApiBody({
        description: '<p>JSON Request:</p>',
        schema: {
            example: {
                filter: {
                    expressions: [
                        {
                            op: 0,
                            key: 'title',
                            comp: 0,
                            value: 'test'
                        }
                    ]
                }
            }
        }
    })
    async filter(@Body('filter') filter: SearchFilter, @Body('paths') paths: string[]) {
        const filteredPublications = await this.publicationService.filterIndex(filter);
        return this.publicationFilterService.applyPaths(filteredPublications, paths);
    }

    @Get('filter')
    async get_filter() {
        return this.publicationFilterService.listDefinitions();
    }

    @Get('duplicates')
    @ApiQuery({
        name: 'id',
        type: 'number',
        required: false
    })
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'reader', app: 'output' }, { role: 'publication_writer', app: 'output' }, { role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    duplicates(@Query('id') id: number, @Query('soft') soft?:boolean) {
        return this.publicationService.getDuplicateEntries(id, soft);
    }

    @Put('duplicates')
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'publication_writer', app: 'output' }, { role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    duplicate_update(@Body() duplicate: PublicationDuplicate) {
        return this.publicationService.updateDuplicate(duplicate);
    }

    @Post('duplicates')
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'publication_writer', app: 'output' }, { role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    @ApiBody({
        description: '<p>JSON Request:</p>',
        schema: {
            example: {
                duplicate: {
                    id_first: 14468,
                    id_second: 14470,
                    description: 'another test'
                }
            }
        }
    })
    duplicate_save(@Body() duplicate: PublicationDuplicate) {
        return this.publicationService.saveDuplicateEntry(duplicate);
    }

    @Delete('duplicates')
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'publication_writer', app: 'output' }, { role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    @ApiBody({
        description: '<p>JSON Request:</p>',
        schema: {
            example: {
                duplicate: {
                    id: 2
                }
            }
        }
    })
    duplicate_del(@Body('duplicate') duplicate: PublicationDuplicate, @Body('soft') soft?: boolean) {
        return this.publicationService.deleteDuplicateEntry(duplicate, soft);
    }

}
