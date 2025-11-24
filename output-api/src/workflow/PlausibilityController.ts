import { Body, Controller, Delete, Get, Post, Query, Res, Inject, NotFoundException, Param, UseGuards } from "@nestjs/common";
import { ApiBody, ApiQuery, ApiTags } from "@nestjs/swagger";
import { ReportItemService } from "./report-item.service";
import { Response } from "express";
import { AccessGuard } from "../authorization/access.guard";
import { Permissions } from "../authorization/permission.decorator";
import { AbstractPlausibilityService, getPlausibilityServiceMeta } from "./check/abstract-plausibility.service";
import { AppConfigService } from "../config/app-config.service";

@Controller("check")
@ApiTags("check")
export class PlausibilityController {

  constructor(private reportService: ReportItemService,
    private configService: AppConfigService,
    @Inject('Checks') private checkServices: AbstractPlausibilityService[]) { }

  list() {
    return this.checkServices.map(i => {
      const meta = getPlausibilityServiceMeta(i.constructor as Function)!;
      return { path: meta.path };
    });
  }

  @Get()
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
  async getImports() {
    const result = [];
    for (let i = 0; i < this.list().length; i++) {
      result.push({
        path: this.list()[i].path,
        label: this.checkServices[i].getName()
      })
    }
    return result;
  }

  @Get("reports")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
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
  @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
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
  @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
  delete_report(@Body('filename') filename: string) {
    return this.reportService.deleteReport(filename);
  }

  @Post(":path")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
  async start(@Param('path') path: string) {
    const so = this.list().findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();
    return this.checkServices[so].check();
  }
  @Get(":path")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
  async status(@Param('path') path: string) {
    const so = this.list().findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();
    return this.checkServices[so].status();
  }
}
