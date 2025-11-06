import { BadRequestException, Body, Controller, Delete, Get, Inject, NotFoundException, Param, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ApiBody, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { Between, In } from "typeorm";
import { UpdateMapping } from "../../../output-interfaces/Config";
import { AccessGuard } from "../authorization/access.guard";
import { Permissions } from "../authorization/permission.decorator";
import { ApiEnrichDOIService, getEnrichServiceMeta } from "./import/api-enrich-doi.service";
import { ReportItemService } from "./report-item.service";
import { AppConfigService } from "../config/app-config.service";

@Controller("enrich")
@ApiTags("enrich")
export class EnrichController {

  constructor(private reportService: ReportItemService,
    private configService: AppConfigService,
    @Inject('Enrichs') private enrichServices: ApiEnrichDOIService[]) { }

  async list() {
    let allowed = await this.configService.get("enrich_services")
    return this.enrichServices.map(i => {
      const meta = getEnrichServiceMeta(i.constructor as Function)!;
      return { path: meta.path, allowed: allowed[meta.path] };
    });
  }

  @Get()
  async getImports() {
    let result = [];
    for (let i = 0; i < (await this.list()).length; i++) {
      if ((await this.list())[i].allowed) result.push({
        path: (await this.list())[i].path,
        label: this.enrichServices[i].getName()
      })
    }
    return result;
  }

  @Get("reports")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  reports() {
    return this.reportService.getReports('Enrich');
  }

  @ApiQuery({
    name: 'filename',
    type: 'string',
    required: true,
    description: 'The report file to be returned.'
  })
  @Get("report")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  async report(@Query('filename') filename: string, @Res() res: Response) {
    res.setHeader('Content-type', 'text/plain')
    res.send(await this.reportService.getReport(filename))
    return this.reportService.getReport(filename);
  }

  @ApiBody({
    description: "<p>JSON Request:</p><pre>{<br />  \"filename\" : \"string\"<br />}</pre>",
    schema: {
      example: {
        filename: '*.*',
      }
    },
  })
  @Delete("report")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  delete_report(@Body('filename') filename: string) {
    return this.reportService.deleteReport(filename);
  }

  @Post(":path")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  @ApiBody({
    description: "<p>JSON Request:</p><pre>{<br />  \"reporting_year\" : \"number\",<br />  \"dry_run\": \"boolean\"<br />}</pre>",
    schema: {
      example: {
        reporting_year: '2022'
      }
    },
  })
  async enrichUnpaywall(@Req() request: Request, @Param('path') path: string, @Body('reporting_year') reporting_year: number, @Body('ids') ids: number[], @Body('dry_run') dryRun: boolean) {
    if (!((ids && ids.length >= 0) || (reporting_year && (reporting_year + '').match('[19|20][0-9]{2}')))) throw new BadRequestException('reporting year or array of IDs is mandatory');
    let so = (await this.list()).findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();
    if (ids && ids.length >= 0) {
      this.enrichServices[so].setWhereClause({ where: { id: In(ids) } });
      return this.enrichServices[so].import(true,request["user"]["username"],dryRun);
    } else {
      let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
      let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
      this.enrichServices[so].setWhereClause({ where: { pub_date: Between(beginDate, endDate) } });
      return this.enrichServices[so].import(true,request["user"]["username"],dryRun);
    }
  }
  @Get(":path")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  async enrichUnpaywallStatus(@Param('path') path: string) {
    let so = (await this.list()).findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();
    return this.enrichServices[so].status();
  }
  @Get(":path/config")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  async importUnpaywallConfig(@Param('path') path: string) {
    let so = (await this.list()).findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();
    return this.enrichServices[so].getUpdateMapping();
  }
  @Post(":path/config")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  async importUnpaywallConfigSet(@Param('path') path: string, @Body('mapping') mapping: UpdateMapping) {
    let so = (await this.list()).findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();
    return this.enrichServices[so].setUpdateMapping(mapping);
  }
}
