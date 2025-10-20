import { BadRequestException, Body, Controller, Delete, Get, Post, Query, Res, UploadedFile, UseInterceptors, Param,Inject,NotFoundException, UseGuards } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiQuery, ApiTags } from "@nestjs/swagger";
import { ReportItemService } from "./report-item.service";
import { Response } from "express";
import { CSVMapping, UpdateMapping } from "../../../output-interfaces/Config";
import { AccessGuard } from "../authorization/access.guard";
import { Permissions } from "../authorization/permission.decorator";
import { AbstractImportService } from "./import/abstract-import";
import { CSVImportService } from "./import/csv-import.service";
import { ExcelImportService } from "./import/excel-import.service";
import { AppConfigService } from "../config/app-config.service";

@Controller("import")
@ApiTags("import")
export class ImportController {

  constructor(
    private reportService: ReportItemService,
    private configService: AppConfigService,
    @Inject('Imports') private importServices: AbstractImportService[],
    private csvService:CSVImportService, private excelService:ExcelImportService) { }

  @Get()
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  async getImports() {
    let result = [];
    for (let i=0;i<(await this.configService.get('import_services')).length;i++) {
      result.push({
        path: this.configService.get('import_services')[i].path, 
        label:this.importServices[i].getName()})
    }
    result.push({path: 'csv', label: this.csvService.getName()})
    result.push({path: 'xls', label: this.excelService.getName()})
    return result;
  }

  @Get("reports")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  reports() {
    return this.reportService.getReports('Import');
  }

  @ApiQuery({
    name: 'filename',
    type: 'string',
    required: true,
    description: 'The report file to be returned.'
  })
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
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
  @Permissions([{ role: 'admin', app: 'output' }])
  delete_report(@Body('filename') filename:string) {
    return this.reportService.deleteReport(filename);
  }

  @Post("csv")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
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
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  importCSVStatus() {
    return this.csvService.status();
  }
  @Get("csv/config")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  importCSVConfig() {
    return this.csvService.getUpdateMapping();
  }
  @Post("csv/config")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  importCSVConfigSet(@Body('mapping') mapping:UpdateMapping) {
    return this.csvService.setUpdateMapping(mapping);
  }

  @Get("csv/mapping")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  importCSVMapping() {
    return this.csvService.getConfigs();
  }

  @Post("csv/mapping")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  @ApiBody({
    type: CSVMapping
  })
  importCSVMappingSet(@Body() mapping:CSVMapping) {
    return this.csvService.addConfig(mapping);
  }

  @Delete("csv/mapping")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
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



  @Post("xls")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
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
        },
        format: {
          type: "CSVMapping"
        }
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  importExcel(@Body('update') update: boolean, @UploadedFile() file: Express.Multer.File, @Body('format') format: CSVMapping) {
    if (!file || !file.originalname.endsWith('.xlsx')) throw new BadRequestException('valid excel file required');
    this.excelService.setUp(file, format);
    return this.excelService.import(update);
  }
  @Get("xls")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  importExcelStatus() {
    return this.excelService.status();
  }
  @Get("xls/config")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  importExcelConfig() {
    return this.excelService.getUpdateMapping();
  }
  @Post("xls/config")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  importExcelConfigSet(@Body('mapping') mapping:UpdateMapping) {
    return this.excelService.setUpdateMapping(mapping);
  }

  @Post(":path")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  @ApiBody({
    description: "<p>JSON Request:</p><pre>{<br />  \"reporting_year\" : \"number\"<br />}</pre>",
    schema: {
      example: {
        reporting_year: '2022',
        update: true
      }
    },
  })
  async importStart(@Param('path') path:string, @Body('reporting_year') reporting_year: string, @Body('update') update: boolean) {
    if (!reporting_year || !reporting_year.match('[19|20][0-9]{2}')) throw new BadRequestException('reporting year is mandatory');
    let so = (await this.configService.get('import_services')).findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();
    this.importServices[so].setReportingYear(reporting_year);
    return this.importServices[so].import(update);
  }

  @Get(':path')
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  async importStatus(@Param('path') path:string) {
    let so = (await this.configService.get('import_services')).findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();
    return this.importServices[so].status();
  }

  @Get(":path/config")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  async importConfig(@Param('path') path:string) {
    let so = (await this.configService.get('import_services')).findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();
    return this.importServices[so].getUpdateMapping();
  }
  @Post(":path/config")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  async importConfigSet(@Param('path') path:string, @Body('mapping') mapping:UpdateMapping) {
    let so = (await this.configService.get('import_services')).findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();
    return this.importServices[so].setUpdateMapping(mapping);
  }
}
