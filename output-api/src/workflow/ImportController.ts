import { BadRequestException, Body, Controller, Delete, Get, Inject, NotFoundException, Param, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { CSVMapping, UpdateMapping } from "../../../output-interfaces/Config";
import { AccessGuard } from "../authorization/access.guard";
import { Permissions } from "../authorization/permission.decorator";
import { AbstractImportService, getImportServiceMeta } from "./import/abstract-import";
import { CSVImportService } from "./import/csv-import.service";
import { ExcelImportService } from "./import/excel-import.service";
import { ReportItemService } from "./report-item.service";
import { AppConfigService } from "../config/app-config.service";
import { WorkflowService } from "./workflow.service";
import { ImportWorkflow } from "./ImportWorkflow.entity";
import { Strategy } from "../../../output-interfaces/Workflow";

@Controller("import")
@ApiTags("import")
export class ImportController {

  constructor(
    private reportService: ReportItemService,
    private configService: AppConfigService,
    @Inject('Imports') private importServices: AbstractImportService[],
    private csvService: CSVImportService, private excelService: ExcelImportService,
    private workflowService: WorkflowService) { }


  async list() {
    const allowed = await this.configService.get("import_services")
    const res = this.importServices.map(i => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      const meta = getImportServiceMeta(i.constructor as Function)!;
      return { path: meta.path, allowed: allowed[meta.path] };
    })
    return res;
  }

  @Get("jsonata_")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  get_imports() {
    return this.workflowService.getImports()
    //return this.workflowService.startImport(1)
  }

  @Post("jsonata_")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  @ApiBody({
    description: '<p>JSON Request:</p>',
    schema: {
      example: {
        workflow_id: 0,
        label: 'Crossref Import',
        strategy_type: Strategy.URL_QUERY_OFFSET,
        strategy: {
          url_count: "https://api.crossref.org/works?query.affiliation=[search_tags]&query.bibliographic=[year]&sort=indexed",
          url_items: "https://api.crossref.org/works?query.affiliation=[search_tags]&query.bibliographic=[year]&sort=indexed",
          max_res: 20,
          max_res_name: "rows",
          request_mode: "offset",
          offset_name: "offset",
          offset_count: 0,
          offset_start: 0,
          delayInMs: 0,
          search_text_combiner: "+",
          parallelCalls: 1,
          get_count: "$.message.\"total-results\"",
          get_items: "$.message.items",
          exclusion_criteria: "$contains($.pub_type,\"posted-content\") or $contains($.pub_type,\"peer-review\")",
          only_import_if_authors_inst: true,
          format: "json"
        },
        mapping: "(    $cfg := params.cfg;    $tags := $cfg.affiliation_tags;    $date_builder := function($array) {(        $year  := $array[0];        $month := $array[1] ? $array[1] : 1;        $day   := $array[2] ? $array[2] : 1;        $year & \"-\" & $pad($string($month), -2, \"0\") & \"-\" & $pad($string($day),-2, \"0\");    )};{    \"title\": $.title[0],    \"doi\": $.DOI,    \"oa_category\": $.license ? \"gold\" : ($.isHybrid ? \"hybrid\" : \"closed\"),    \"authors_inst\": $.author[      (      $hits := $filter(affiliation, function($aff) {        $count(          $filter($tags, function($tag) {            $contains($lowercase($aff.name), $lowercase($tag))          })        ) > 0      });      $count($hits) > 0    )        ].{        \"first_name\": given,        \"last_name\": family,        \"orcid\": ORCID,        \"affiliation\": affiliation[(                $hits := $filter(name, function($aff) {                    $count(                    $filter($tags, function($tag) {                        $contains($lowercase($aff), $lowercase($tag))                    })                    ) > 0                });                $count($hits) > 0                )][0].name        }[],    \"authors\": $join($.author.($string(given & \" \" & family)), \"; \"),    \"greater_entity\": {      \"label\": $.\"container-title\"[0],      \"identifiers\": $.ISSN.{        \"type\" : \"issn\",        \"value\" : $      }    },    \"publisher\": {      \"label\": $.publisher    },    \"pub_date\": (        $dp := $.\"published-online\".\"date-parts\"[0];        $dp ? $date_builder($dp)        ),    \"pub_date_print\": (        $dp := $.\"published-print\".\"date-parts\"[0];        $dp ? $date_builder($dp)        ),    \"pub_date_accepted\": (        $dp := $.\"approved\" ? $.\"approved\".\"date-parts\"[0] : $.\"accepted\".\"date-parts\"[0];        $dp ? $date_builder($dp)        ),    \"language\": $.language,    \"link\": $.URL,    \"funder\": $.funder[].{        \"label\": name,        \"doi\": DOI    },    \"pub_type\": $.type,    \"license\": (        $url := $.license[$lookup($, \"content-version\")=\"vor\"].URL;        $url ? ($contains($string($url), \"creativecommons.org/licenses/by/\") ? 'cc-by' : (            $contains($string($url), \"creativecommons.org/licenses/by-nc/\") ? 'cc-by-nc' : (                $contains($string($url), \"creativecommons.org/licenses/by-nc-nd/\") ? 'cc-by-nc-nd' : null            )        )) : null    ),    \"status\": 1,    \"abstract\": $.abstract,    \"page_count\": (        $p := $.page;        /* Bereich \"start-end\" nur mit Ziffern */        $range := $match($p, /^(\\d+)\\s*-\\s*(\\d+)$/);        /* Einzelne Seite nur Ziffern */        $single := $match($p, /^(\\d+)$/);        $range ? (            $start := $number($range[0].groups[0]);            $end := $number($range[0].groups[1]);            $end - $start + 1            )        : ($single ? 1 : null)        )})"
      }
    }
  })
  save_import(@Body() body: ImportWorkflow) {
    return this.workflowService.saveImport(body);
  }

  @Get()
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  async getImports() {
    const result = [];
    for (let i = 0; i < this.importServices.length; i++) {
      if ((await this.list())[i].allowed) result.push({
        path: (await this.list())[i].path,
        label: this.importServices[i].getName()
      })
    }
    result.push({ path: 'csv', label: this.csvService.getName() })
    result.push({ path: 'xls', label: this.excelService.getName() })
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
        },
        dry_run: {
          type: 'boolean'
        }
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  importCSV(@Req() request, @Body('update') update: boolean, @UploadedFile() file: Express.Multer.File, @Body('format') format: CSVMapping, @Body('dry_run') dryRun: boolean) {
    if (!file || !file.originalname.endsWith('.csv')) throw new BadRequestException('valid csv file required');
    this.csvService.setUp(file, format);
    return this.csvService.import(update, request["user"]["username"], dryRun);
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
  importCSVConfigSet(@Body('mapping') mapping: UpdateMapping) {
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
  importCSVMappingSet(@Body() mapping: CSVMapping) {
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
  importCSVConfigDelete(@Body('name') name: string) {
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
        },
        dry_run: {
          type: 'boolean'
        }
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  importExcel(@Req() request, @Body('update') update: boolean, @UploadedFile() file: Express.Multer.File, @Body('format') format: CSVMapping, @Body('dry_run') dryRun: boolean) {
    if (!file || !file.originalname.endsWith('.xlsx')) throw new BadRequestException('valid excel file required');
    this.excelService.setUp(file, format);
    return this.excelService.import(update, request["user"]["username"], dryRun);
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
  importExcelConfigSet(@Body('mapping') mapping: UpdateMapping) {
    return this.excelService.setUpdateMapping(mapping);
  }

  @Post(":path")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  @ApiBody({
    description: "",
    schema: {
      example: {
        reporting_year: '2022',
        update: true,
        dry_run: false
      }
    },
  })
  async importStart(@Req() request, @Param('path') path: string, @Body('reporting_year') reporting_year: string, @Body('update') update: boolean, @Body('dry_run') dryRun: boolean) {
    if (!reporting_year || !reporting_year.match('[19|20][0-9]{2}')) throw new BadRequestException('reporting year is mandatory');
    const so = (await this.list()).findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();
    await this.importServices[so].setReportingYear(reporting_year);
    return this.importServices[so].import(update, request["user"]["username"], dryRun);
  }

  @Get(':path')
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  async importStatus(@Param('path') path: string) {
    const so = (await this.list()).findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();
    return this.importServices[so].status();
  }

  @Get(":path/config")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  async importConfig(@Param('path') path: string) {
    const so = (await this.list()).findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();
    return this.importServices[so].getUpdateMapping();
  }
  @Post(":path/config")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  async importConfigSet(@Param('path') path: string, @Body('mapping') mapping: UpdateMapping) {
    const so = (await this.list()).findIndex(e => e.path === path)
    if (so === -1) throw new NotFoundException();
    return this.importServices[so].setUpdateMapping(mapping);
  }
}
