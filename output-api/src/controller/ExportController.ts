import { Body, Controller, Delete, Get, Post, Query, Res, Inject,NotFoundException,Param, UseGuards,Req } from "@nestjs/common";
import { ApiBody, ApiQuery, ApiTags } from "@nestjs/swagger";
import { ReportItemService } from "../services/report-item.service";
import { Response } from "express";
import { ConfigService } from "@nestjs/config";
import { AbstractExportService } from "../services/export/abstract-export.service";
import { AccessGuard } from "../guards/access.guard";
import { Permissions } from "../guards/permission.decorator";
import { SearchFilter } from "../../../output-interfaces/Config";

@Controller("export")
@ApiTags("export")
export class ExportController {

  constructor(private configService:ConfigService,
    private reportService: ReportItemService,
    @Inject('Exports') private exportServices: AbstractExportService[]) { }

  @Get()
  getExports() {
    let result = [];
    for (let i=0;i<this.configService.get('export_services').length;i++) {
      result.push({
        path: this.configService.get('export_services')[i].path, 
        label:this.exportServices[i].getName()})
    }
    return result;
  }

  @Get("reports")
  reports() {
    return this.reportService.getReports('Export');
  }

  @ApiQuery({
    name: 'filename',
    type: 'string',
    required: true,
    description: 'The report file to be returned.'
  })
  @Get("report")
  report(@Query('filename') filename: string, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Content-type', 'text/plain')
    res.send(this.reportService.getReport(filename))
    //return this.reportService.getReport(filename);
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
  async exportMaster(@Param('path') path: string, @Req() request:Request, @Body('filter') filter?:{filter:SearchFilter, paths: string[]}) {
    //res.setHeader('Content-type', 'text/plain')
    let so = this.configService.get('export_services').findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();
    return this.exportServices[so].export(filter, request['user']);
  }

  @Get(":path")
  exportMasterStatus(@Param('path') path: string) {
    let so = this.configService.get('export_services').findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();
    return this.exportServices[so].status();
  }
}
