import { Publication } from "../entity/Publication";
import { InjectRepository } from "@nestjs/typeorm";
import { BadRequestException, Body, Controller, Delete, Get, InternalServerErrorException, Post, Put, Query, Req, UseGuards, Inject, NotFoundException } from "@nestjs/common";
import { ApiBody, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Between } from "typeorm";
import { PublicationService } from "../services/entities/publication.service";
import { AppConfigService } from "../services/app-config.service";
import { PublicationIndex } from "../../../output-interfaces/PublicationIndex";
import { AccessGuard } from "../guards/access.guard";
import { Permissions } from "../guards/permission.decorator";
import { SearchFilter } from "../../../output-interfaces/Config";
import { AbstractFilterService } from "../services/filter/abstract-filter.service";
import { ConfigService } from "@nestjs/config";

@Controller("publications")
@ApiTags("publications")
export class PublicationController {

    constructor(@InjectRepository(Publication) private repository, 
    private publicationService:PublicationService, 
    private appConfigService:AppConfigService,
    private configService:ConfigService,
    @Inject('Filters') private filterServices: AbstractFilterService<PublicationIndex>[]) { }

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
        if (!yop) throw new BadRequestException('no reporting year');
        let beginDate = new Date(Date.UTC(yop, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(yop, 11, 31, 23, 59, 59, 999));
        //Show all
        return this.repository.find({ where: [{ pub_date: Between(beginDate, endDate) }, ], relations: {
            oa_category: true,
                invoices: request['user']? request['user']['read'] : false,
                authorPublications: {
                    author: true,
                    institute: true
                },
                greater_entity: true,
                pub_type: true,
                publisher: true,
                contract: true,
                funders: true
        } }).catch(err => {
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
        return await this.publicationService.getPublication(id, request['user']? request['user']['read'] : false, request['user']? request['user']['write'] : false);
    }

    @Get('publicationIndex')
    @ApiQuery({
        name: 'yop',
        type: 'integer',
        required: true,
        description: 'The YOP that should be reported.',
        example: "2022"
    })
    async index(@Query('yop') yop: number, @Query('soft') soft?: boolean) : Promise<PublicationIndex[]> {
        if (!yop && !soft) throw new BadRequestException('reporting year or soft has to be given');
        if (yop) return await this.publicationService.index(yop);
        else return await this.publicationService.softIndex();
    }

    @Post()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }])
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
        return this.repository.save(body).catch(err => {
            console.log(err);
            throw new InternalServerErrorException('Failure while inserting');
        });
    }

    @Put()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }])
    async update(@Body() body: Publication[]) {
            /*let resp = [];
            for (const pub of body) {
                resp.push(await this.repository.update(pub.id, pub).catch(err => {
                    console.log(err);
                    throw new InternalServerErrorException('Failure while update');
                }));
            }
            return resp;*/
            return this.publicationService.update(body);
    }

    @Delete()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }])
    async remove(@Body('publications') publications: Publication[],@Body('soft') soft?: boolean) {
        return this.publicationService.delete(publications,soft);
    }

    @Get('reporting_year')
    @ApiQuery({
        name: 'default',
        type: 'boolean',
        required: false
    })
    getReportingYear(@Query('default') standard:boolean) {
        if (standard) return this.appConfigService.get('reporting_year');
        else return this.publicationService.getReportingYears();
    }

    @Post('reporting_year')
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }])
    @ApiBody({
        description: '<p>JSON Request:</p>',
        schema: {
            example: {
                year: 2023
            }
        }
    })
    setReportingYear(@Body('year') year:number) {
        return this.appConfigService.setDefaultReportingYear(year);
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
    async combine(@Body('id1') id1: number, @Body('ids') ids: number[]) {
        let res = await this.publicationService.combine(id1,ids);
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
    async filter(@Body('filter') filter:SearchFilter, @Body('paths') paths:string[]) {
        let res = await this.publicationService.filterIndex(filter);
        if (paths && paths.length > 0) for (let path of paths) {
            let so = this.configService.get('filter_services').findIndex(e => e.path === path)
            if (so === -1) throw new NotFoundException();
            res = await this.filterServices[so].filter(res)
        }
        return res;
    }

    @Get('filter')
    get_filter() {
        let result = [];
        for (let i=0;i<this.configService.get('filter_services').length;i++) {
          result.push({
            path: this.configService.get('filter_services')[i].path, 
            label:this.filterServices[i].getName()})
        }
        return result;
    }
}
