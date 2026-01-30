import { Body, Controller, Delete, Get, Param, Post, Query, Res, UseGuards } from "@nestjs/common";
import { ApiBody, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { Strategy } from "../../../output-interfaces/Workflow";
import { AccessGuard } from "../authorization/access.guard";
import { Permissions } from "../authorization/permission.decorator";
import { AppConfigService } from "../config/app-config.service";
import { ImportWorkflow } from "./ImportWorkflow.entity";
import { ReportItemService } from "./report-item.service";
import { WorkflowService } from "./workflow.service";

@Controller("workflow")
@ApiTags("workflow")
export class WorkflowController {

  constructor(
    private reportService: ReportItemService,
    private configService: AppConfigService,
    private workflowService: WorkflowService) { }

  @Get("import")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  get_imports(@Query('type') type?:'draft'|'published'|'archived') {
    return this.workflowService.getImports(type)
    //return this.workflowService.startImport(1)
  }

  @Get("import/:id")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  get_import(@Param('id') id: number) {
    return this.workflowService.getImport(id);
  }

  @Post("import")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  @ApiBody({
    description: '<p>JSON Request:</p>',
    schema: {
      example: {
        workflow_id: 0,
        version: 1,
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

  @Get("reports")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  reports() {
    return this.reportService.getReports("Worfklow_Import");
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
}
