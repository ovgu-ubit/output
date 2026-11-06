import { StreamableFile } from '@nestjs/common';
import { ExportDisposition, ExportFormat, ExportWorkflow } from '@output/interfaces';
import { Response } from 'express';

export function createExportResponse(workflow: ExportWorkflow, result: string | Buffer, response: Response) {
    const strategy = workflow.strategy ?? {};
    const format: ExportFormat = strategy.format ?? 'json';
    const disposition: ExportDisposition = strategy.disposition ?? (format === 'xlsx' ? 'attachment' : 'inline');
    const types: Record<ExportFormat, string> = {
        json: 'application/json; charset=utf-8',
        xml: 'application/xml; charset=utf-8',
        csv: 'text/csv; charset=utf-8',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    const label = (workflow.label ?? 'Export').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'Export';
    const now = new Date();
    const pad = (value: number) => value.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `${label}_v${workflow.version ?? 1}_${timestamp}.${format}`;
    const contentDisposition = `${disposition}; filename="${filename}"`;
    response.setHeader('Content-Type', types[format]);
    response.setHeader('Content-Disposition', contentDisposition);
    return Buffer.isBuffer(result)
        ? new StreamableFile(result, { type: types[format], disposition: contentDisposition })
        : result;
}
