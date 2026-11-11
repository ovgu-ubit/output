import { Body, Controller, Delete, Get, Inject, Param, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ApiBody, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { Between, In } from "typeorm";
import {  UpdateMapping  } from '@output/interfaces';
import { AccessGuard } from "../authorization/access.guard";
import { Permissions } from "../authorization/permission.decorator";
import { ApiEnrichDOIService, getEnrichServiceMeta } from "./import/api-enrich-doi.service";
import { ReportItemService } from "./report-item.service";
import { AppConfigService } from "../config/app-config.service";
import { JSONataImportService } from "./import/jsonata-import";
import { createInvalidRequestHttpException, createNotFoundHttpException } from "../common/api-error";
import { ImportExecutionService } from './import-execution.service';
import { ApiImportStop } from './import-stop-api';

@Controller("enrich")
@ApiTags("enrich")
export class EnrichController {

  constructor(private reportService: ReportItemService,
    private configService: AppConfigService,
    @Inject('Enrichs') private enrichServices: ApiEnrichDOIService[],
    private executions: ImportExecutionService = new ImportExecutionService()) { }

  @Post(':path/stop')
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  @ApiImportStop()
  async stop(@Param('path') path: string, @Req() req, @Res({ passthrough: true }) res: Response) {
    const run = this.executions.get(`legacy-enrich:${path}`);
    if (!(await this.list()).some(entry => entry.path === path)) throw createNotFoundHttpException('Enrich service not found.');
    const result = this.executions.requestStop(`legacy-enrich:${path}`, 'user', req.user?.username, run ?? null);
    res.status(result.state === 'stopping' ? 202 : 200);
    return result;
  }

  async list() {
    const allowed = await this.configService.get("enrich_services")
    return this.enrichServices.map(i => {
      const meta = getEnrichServiceMeta(i.constructor as Function)!;
      return { path: meta.path, allowed: allowed[meta.path] };
    });
  }

  @Get()
  async getImports() {
    const result = [];
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
    if (!((ids && ids.length >= 0) || (reporting_year && (reporting_year + '').match('[19|20][0-9]{2}')))) throw createInvalidRequestHttpException('reporting year or array of IDs is mandatory');
    const so = (await this.list()).findIndex(e => e.path === path);
    if (so === -1) throw createNotFoundHttpException('Enrich service not found.');
    const service = this.enrichServices[so];
    return this.executions.run('legacy-enrich:' + path, { kind: 'enrich', path }, service, async () => {
      const byIds = ids && ids.length >= 0;
      const where = byIds ? { where: { id: In(ids) } } : { where: { pub_date: Between(
        new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0)),
        new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999)),
      ) } };
      if (path === 'jsonata') {
        const jsonata = service as unknown as JSONataImportService;
        jsonata.enrich_whereClause = where;
        if (!byIds) await jsonata.setReportingYear(reporting_year + '');
        return jsonata.enrich(request["user"]["username"], dryRun);
      }
      service.setWhereClause(where);
      return service.import(true, request["user"]["username"], dryRun);
    });
  }
  @Get(":path")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  async enrichUnpaywallStatus(@Param('path') path: string) {
    const so = (await this.list()).findIndex(e => e.path === path)
    if (so === -1) throw createNotFoundHttpException('Enrich service not found.');
    return this.enrichServices[so].status();
  }
  @Get(":path/config")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  async importUnpaywallConfig(@Param('path') path: string) {
    const so = (await this.list()).findIndex(e => e.path === path)
    if (so === -1) throw createNotFoundHttpException('Enrich service not found.');
    return this.enrichServices[so].getUpdateMapping();
  }
  @Post(":path/config")
  @UseGuards(AccessGuard)
  @Permissions([{ role: 'admin', app: 'output' }])
  async importUnpaywallConfigSet(@Param('path') path: string, @Body('mapping') mapping: UpdateMapping) {
    const so = (await this.list()).findIndex(e => e.path === path)
    if (so === -1) throw createNotFoundHttpException('Enrich service not found.');
    return this.enrichServices[so].setUpdateMapping(mapping);
  }
}
