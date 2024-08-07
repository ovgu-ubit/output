import { BadRequestException, Body, Controller, Delete, Get, Post, Query, Res, Inject, Param, NotFoundException, UseGuards } from "@nestjs/common";
import { ApiBody, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Between, In } from "typeorm";
import { ReportItemService } from "../services/report-item.service";
import { Response } from "express";
import { UpdateMapping } from "../../../output-interfaces/Config";
import { ConfigService } from "@nestjs/config";
import { ApiEnrichDOIService } from "../services/import/api-enrich-doi.service";
import { AccessGuard } from "../guards/access.guard";
import { Permissions } from "../guards/permission.decorator";

@Controller("enrich")
@ApiTags("enrich")
export class EnrichController {

  constructor(private reportService: ReportItemService,
    private configService: ConfigService,
    @Inject('Enrichs') private enrichServices: ApiEnrichDOIService[]) { }

  @Get()
  getImports() {
    let result = [];
    for (let i=0;i<this.configService.get('enrich_services').length;i++) {
      result.push({
        path: this.configService.get('enrich_services')[i].path, 
        label:this.enrichServices[i].getName()})
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
  report(@Query('filename') filename: string, @Res() res: Response) {
    res.setHeader('Content-type', 'text/plain')
    res.send(this.reportService.getReport(filename))
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
    description: "<p>JSON Request:</p><pre>{<br />  \"reporting_year\" : \"number\"<br />}</pre>",
    schema: {
      example: {
        reporting_year: '2022'
      }
    },
  })
  enrichUnpaywall(@Param('path') path: string, @Body('reporting_year') reporting_year: number, @Body('ids') ids: number[]) {
    if (!((ids && ids.length >= 0) || (reporting_year && (reporting_year + '').match('[19|20][0-9]{2}')))) throw new BadRequestException('reporting year or array of IDs is mandatory');
    let so = this.configService.get('enrich_services').findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();
    if (ids && ids.length >= 0) {
      this.enrichServices[so].setWhereClause({ where: { id: In(ids) } });
      return this.enrichServices[so].import(true);
    } else {
      let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
      let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
      this.enrichServices[so].setWhereClause({ where: { pub_date: Between(beginDate, endDate) } });
      return this.enrichServices[so].import(true);
    }
  }
  @Get(":path")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  enrichUnpaywallStatus(@Param('path') path: string) {
    let so = this.configService.get('enrich_services').findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();
    return this.enrichServices[so].status();
  }
  @Get(":path/config")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  importUnpaywallConfig(@Param('path') path: string) {
    let so = this.configService.get('enrich_services').findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();
    return this.enrichServices[so].getUpdateMapping();
  }
  @Post(":path/config")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  importUnpaywallConfigSet(@Param('path') path: string, @Body('mapping') mapping: UpdateMapping) {
    let so = this.configService.get('enrich_services').findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();
    return this.enrichServices[so].setUpdateMapping(mapping);
  }
}
