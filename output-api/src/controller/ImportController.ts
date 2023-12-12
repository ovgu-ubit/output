import { BadRequestException, Body, Controller, Delete, Get, Post, Query, Res, UploadedFile, UseInterceptors, Param,Inject,NotFoundException, UseGuards } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CSVImportService } from "../services/import/csv-import.service";
import { ReportItemService } from "../services/report-item.service";
import { Response } from "express";
import { CSVMapping, UpdateMapping } from "../../../output-interfaces/Config";
import { ConfigService } from "@nestjs/config";
import { AbstractImportService } from "../services/import/abstract-import";
import { AccessGuard } from "../guards/access.guard";
import { Permissions } from "../guards/permission.decorator";

@Controller("import")
@ApiTags("import")
export class ImportController {

  constructor(
    private reportService: ReportItemService,
    private configService: ConfigService,
    @Inject('Imports') private importServices: AbstractImportService[],
    private csvService:CSVImportService) { }

  @Get()
  getImports() {
    let result = [];
    for (let i=0;i<this.configService.get('import_services').length;i++) {
      result.push({
        path: this.configService.get('import_services')[i].path, 
        label:this.importServices[i].getName()})
    }
    result.push({path: 'csv', label: this.csvService.getName()})
    return result;
  }

  @Get("reports")
  reports() {
    return this.reportService.getReports('Import');
  }

  @ApiQuery({
    name: 'filename',
    type: 'string',
    required: true,
    description: 'The report file to be returned.'
  })
  @Get("report")
  report(@Query('filename') filename:string, @Res() res:Response) {
    res.setHeader('Content-type','text/plain')
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
  delete_report(@Body('filename') filename:string) {
    return this.reportService.deleteReport(filename);
  }

  @Post("csv")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'writer', app: 'output' }])
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        update: {
          type: 'boolean'
        }
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  importCSV(@Body('update') update: boolean, @UploadedFile() file: Express.Multer.File, @Body('format') format: CSVMapping) {
    if (!file || !file.originalname.endsWith('.csv')) throw new BadRequestException('valid csv file required');
    this.csvService.setUp(file, format);
    return this.csvService.import(update);
  }
  @Get("csv")
  importCSVStatus() {
    return this.csvService.status();
  }
  @Get("csv/config")
  importCSVConfig() {
    return this.csvService.getUpdateMapping();
  }
  @Post("csv/config")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'writer', app: 'output' }])
  importCSVConfigSet(@Body('mapping') mapping:UpdateMapping) {
    return this.csvService.setUpdateMapping(mapping);
  }

  @Get("csv/mapping")
  importCSVMapping() {
    return this.csvService.getConfigs();
  }

  @Post("csv/mapping")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'writer', app: 'output' }])
  @ApiBody({
    type: CSVMapping
  })
  importCSVMappingSet(@Body() mapping:CSVMapping) {
    return this.csvService.addConfig(mapping);
  }

  @Delete("csv/mapping")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'writer', app: 'output' }])
  @ApiBody({
    schema: {
      example: {
        name: 'Test'
      }
    },
  })
  importCSVConfigDelete(@Body('name') name:string) {
    return this.csvService.deleteConfig(name);
  }

  @Post(":path")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'writer', app: 'output' }])
  @ApiBody({
    description: "<p>JSON Request:</p><pre>{<br />  \"reporting_year\" : \"number\"<br />}</pre>",
    schema: {
      example: {
        reporting_year: '2022',
        update: true
      }
    },
  })
  importStart(@Param('path') path:string, @Body('reporting_year') reporting_year: string, @Body('update') update: boolean) {
    if (!reporting_year || !reporting_year.match('[19|20][0-9]{2}')) throw new BadRequestException('reporting year is mandatory');
    let so = this.configService.get('import_services').findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();
    this.importServices[so].setReportingYear(reporting_year);
    return this.importServices[so].import(update);
  }

  @Get(':path')
  importStatus(@Param('path') path:string) {
    let so = this.configService.get('import_services').findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();
    return this.importServices[so].status();
  }

  @Get(":path/config")
  importConfig(@Param('path') path:string) {
    let so = this.configService.get('import_services').findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();
    return this.importServices[so].getUpdateMapping();
  }
  @Post(":path/config")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'writer', app: 'output' }])
  importConfigSet(@Param('path') path:string, @Body('mapping') mapping:UpdateMapping) {
    let so = this.configService.get('import_services').findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();
    return this.importServices[so].setUpdateMapping(mapping);
  }
}
