import { BadRequestException, Body, Controller, Delete, Get, Inject, InternalServerErrorException, NotFoundException, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBody, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Between } from "typeorm";
import { SearchFilter } from "../../../../output-interfaces/Config";
import { PublicationIndex } from "../../../../output-interfaces/PublicationIndex";
import { Publication } from "./Publication.entity";
import { Permissions } from "../../authorization/permission.decorator";
import { AppConfigService } from "../../config/app-config.service";
import { PublicationService } from "./publication.service";
import { PublicationDuplicate } from "./PublicationDuplicate.entity";
import { AccessGuard } from "../../authorization/access.guard";
import { AbstractFilterService, getFilterServiceMeta } from "../../workflow/filter/abstract-filter.service";

@Controller("publications")
@ApiTags("publications")
export class PublicationController {

    constructor(@InjectRepository(Publication) private repository,
        private publicationService: PublicationService,
        private appConfigService: AppConfigService,
        private configService: AppConfigService,
        @Inject('Filters') private filterServices: AbstractFilterService<PublicationIndex | Publication>[]) { }

      list() {
        return this.filterServices.map(i => {
          const meta = getFilterServiceMeta(i.constructor as Function)!;
          return { path: meta.path };
        });
      }

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
        let year;
        if (!yop) year = this.appConfigService.get("reporting_year");
        else year = yop;
        let beginDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
        //Show all
        return this.repository.find({
            where: [{ pub_date: Between(beginDate, endDate) },], relations: {
                oa_category: true,
                invoices: request['user'] ? request['user']['read'] : false,
                authorPublications: {
                    author: true,
                    institute: true
                },
                greater_entity: true,
                pub_type: true,
                publisher: true,
                contract: true,
                funders: true
            }
        }).catch(err => {
            console.log(err);
            throw new InternalServerErrorException('Failure while selecting');
        });
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
        if (!id) throw new BadRequestException('id must be given')
        return await this.publicationService.getPublication(id, request['user'] ? request['user']['read'] : false, request['user'] ? request['user']['write_publication'] : false);
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
        if ((yop === null || yop === undefined) && !soft) throw new BadRequestException('reporting year or soft has to be given');

        if (!soft) {
            if (Number.isNaN(yop)) return await this.publicationService.index(null);
            else return await this.publicationService.index(yop);
        }
        else return await this.publicationService.softIndex();
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
    async save(@Body() body: Publication) {
        return this.publicationService.save([body]);
    }

    @Put()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'publication_writer', app: 'output' }, { role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    async update(@Body() body: Publication[] | Publication) {
        if (Array.isArray(body)) return this.publicationService.update(body);
        else return this.publicationService.update([body]);
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
        let res = await this.publicationService.combine(id1, ids);
        if (res['error'] && res['error'] === 'update') throw new InternalServerErrorException('Problems while updating first publication')
        else if (res['error'] && res['error'] === 'delete') throw new InternalServerErrorException('Problems while deleting second publication')
        else return res;
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
        let res = await this.publicationService.filterIndex(filter);
        if (paths && paths.length > 0) for (let path of paths) {
            let so = this.list().findIndex(e => e.path === path)
            if (so === -1) throw new NotFoundException();
            res = await this.filterServices[so].filter(res)
        }
        return res;
    }

    @Get('filter')
    async get_filter() {
        let result = [];
        for (let i = 0; i < this.list().length; i++) {
            result.push({
                path: this.list()[i].path,
                label: this.filterServices[i].getName()
            })
        }
        return result;
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
        if (id) return this.publicationService.getDuplicates(id);
        else return this.publicationService.getAllDuplicates(soft);
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
        return this.publicationService.saveDuplicate(duplicate.id_first, duplicate.id_second, duplicate.description);
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
        return this.publicationService.deleteDuplicate(duplicate.id, soft);
    }

}
