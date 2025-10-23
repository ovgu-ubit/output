import { Body, Controller, Delete, Get, Inject, NotFoundException, Param, Post, Query, Req, Res, StreamableFile, UseGuards } from "@nestjs/common";
import { ApiBody, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { SearchFilter } from "../../../output-interfaces/Config";
import { PublicationIndex } from "../../../output-interfaces/PublicationIndex";
import { AccessGuard } from "../authorization/access.guard";
import { Permissions } from "../authorization/permission.decorator";
import { Publication } from "../publication/core/Publication";
import { AbstractExportService } from "./export/abstract-export.service";
import { AbstractFilterService } from "./filter/abstract-filter.service";
import { ReportItemService } from "./report-item.service";
import { AppConfigService } from "../config/app-config.service";

@Controller("export")
@ApiTags("export")
export class ExportController {

  constructor(private configService: AppConfigService,
    private reportService: ReportItemService,
    @Inject('Exports') private exportServices: AbstractExportService[],
    @Inject('Filters') private filterServices: AbstractFilterService<PublicationIndex | Publication>[]) { }

  @Get()
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'reader', app: 'output' }, { role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
  async getExports() {
    let result = [];
    for (let i = 0; i < (await this.configService.get('export_services')).length; i++) {
      result.push({
        path: (await this.configService.get('export_services'))[i].path,
        label: this.exportServices[i].getName()
      })
    }
    return result;
  }

  @Get("reports")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'reader', app: 'output' }, { role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
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
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'reader', app: 'output' }, { role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
  async report(@Query('filename') filename: string, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Content-type', 'text/plain')
    res.send(await this.reportService.getReport(filename))
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
  @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
  delete_report(@Body('filename') filename: string) {
    return this.reportService.deleteReport(filename);
  }

  @Post(":path")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'reader', app: 'output' }, { role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
  async exportMaster(@Param('path') path: string, @Res({ passthrough: true }) res: Response, @Req() request: Request, 
  @Body('filter') filter?: { filter: SearchFilter, paths: string[] },
  @Body('withMasterData') withMasterData?: boolean) {
    //res.setHeader('Content-type', 'text/plain')
    let so = (await this.configService.get('export_services')).findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();

    if (this.exportServices[so].isExcelResponse()) {
      return new StreamableFile(await this.exportServices[so].export(filter, this.filterServices, request['user']['id'], withMasterData), {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        disposition: 'attachment; filename="Excel.xlsx"'
      });
    } else return this.exportServices[so].export(filter, this.filterServices, request['user']['id'], withMasterData);
  }

  @Get(":path")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'reader', app: 'output' }, { role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
  async exportMasterStatus(@Param('path') path: string) {
    let so = (await this.configService.get('export_services')).findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();
    return this.exportServices[so].status();
  }
}
