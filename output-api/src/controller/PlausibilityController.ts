import { Body, Controller, Delete, Get, Post, Query, Res, Inject, NotFoundException, Param, UseGuards } from "@nestjs/common";
import { ApiBody, ApiQuery, ApiTags } from "@nestjs/swagger";
import { ReportItemService } from "../services/report-item.service";
import { Response } from "express";
import { ConfigService } from "@nestjs/config";
import { AbstractPlausibilityService } from "../services/check/abstract-plausibility.service";
import { AccessGuard } from "../guards/access.guard";
import { Permissions } from "../guards/permission.decorator";

@Controller("check")
@ApiTags("check")
export class PlausibilityController {

  constructor(private reportService: ReportItemService,
    private configService: ConfigService,
    @Inject('Checks') private checkServices: AbstractPlausibilityService[]) { }

  @Get()
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'writer', app: 'output' }])
  getImports() {
    let result = [];
    for (let i=0;i<this.configService.get('check_services').length;i++) {
      result.push({
        path: this.configService.get('check_services')[i].path, 
        label:this.checkServices[i].getName()})
    }
    return result;
  }

  @Get("reports")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'writer', app: 'output' }])
  reports() {
    return this.reportService.getReports('Check');
  }

  @ApiQuery({
    name: 'filename',
    type: 'string',
    required: true,
    description: 'The report file to be returned.'
  })
  @Get("report")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'writer', app: 'output' }])
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
  @Permissions([{ role: 'writer', app: 'output' }])
  delete_report(@Body('filename') filename: string) {
    return this.reportService.deleteReport(filename);
  }

  @Post(":path")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'writer', app: 'output' }])
  start(@Param('path') path: string) {
    let so = this.configService.get('check_services').findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();
    return this.checkServices[so].check();
  }
  @Get(":path")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'writer', app: 'output' }])
  status(@Param('path') path: string) {
    let so = this.configService.get('check_services').findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();
    return this.checkServices[so].status();
  }
}
