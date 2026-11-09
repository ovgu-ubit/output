import { Body, Controller, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Permissions } from '../authorization/permission.decorator';
import { ExportEndpointGuard, ExportEndpointHttpRequest } from './export/export-endpoint.guard';
import { ExportEndpointService } from './export/export-endpoint.service';
import { createExportResponse } from './export/export-response';

@Controller('workflow/export/api')
@ApiTags('workflow')
export class ExportEndpointController {
    constructor(private readonly endpoints: ExportEndpointService) { }

    @Post(':name')
    @HttpCode(200)
    @UseGuards(ExportEndpointGuard)
    @Permissions([{ role: 'reader', app: 'output' }, { role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    @ApiOperation({ summary: 'Run a published publication export by endpoint name', description: 'Access and output format are configured by the export workflow. Protected endpoints use the existing Output authentication.' })
    @ApiParam({ name: 'name', example: 'publikationen' })
    @ApiBody({ required: false, schema: { type: 'object', properties: {
        filter: { type: 'object', properties: { expressions: { type: 'array', items: { type: 'object', properties: {
            op: { type: 'integer', enum: [0, 1, 2] }, key: { type: 'string' },
            comp: { type: 'integer', enum: [0, 1, 2, 3, 4, 5] }, value: {},
        }, required: ['op', 'key', 'comp', 'value'] } } }, required: ['expressions'] },
        paths: { type: 'array', items: { type: 'string' } },
    }, example: { filter: { expressions: [{ op: 0, key: 'title', comp: 0, value: 'test' }] }, paths: [] } } })
    @ApiProduces('application/json', 'application/xml', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    @ApiResponse({ status: 200, description: 'Mapped publication export in the configured format.' })
    @ApiResponse({ status: 400, description: 'Invalid request or mapping.' })
    @ApiResponse({ status: 403, description: 'Authentication or required role missing.' })
    @ApiResponse({ status: 404, description: 'No active published endpoint with this name.' })
    async run(@Req() request: ExportEndpointHttpRequest, @Body() body: unknown, @Res({ passthrough: true }) response: Response) {
        const workflow = request.exportWorkflow;
        const result = await this.endpoints.run(workflow, body, request.user?.username);
        return createExportResponse(workflow, result, response);
    }
}
