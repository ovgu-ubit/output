import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { ExportStrategy } from '@output/interfaces';
import { IsNull, Not, Raw, Repository } from 'typeorm';
import { createForbiddenHttpException, createNotFoundHttpException } from '../../common/api-error';
import { PublicationFilterService } from '../../publication/core/publication-filter.service';
import { ExportWorkflow } from '../ExportWorkflow.entity';
import { validateExportWorkflow } from '../export-workflow.schema';
import { parseExportEndpointRequest } from './export-endpoint.schema';
import { JSONataExportService } from './jsonata-export.service';

@Injectable()
export class ExportEndpointService {
    constructor(
        @InjectRepository(ExportWorkflow) private readonly repository: Repository<ExportWorkflow>,
        private readonly moduleRef: ModuleRef,
        private readonly publicationFilters: PublicationFilterService,
    ) { }

    async resolve(name: string): Promise<ExportWorkflow> {
        const workflow = await this.repository.findOne({ where: {
            strategy_type: ExportStrategy.ENDPOINT,
            source_entity: 'publication',
            strategy: Raw(alias => `${alias} ->> 'endpoint_name' = :endpointName`, { endpointName: name }),
            published_at: Not(IsNull()),
            deleted_at: IsNull(),
        } });
        if (!workflow) throw createNotFoundHttpException('Export endpoint not found.');
        return validateExportWorkflow(workflow);
    }

    async run(workflow: ExportWorkflow, body: unknown, username?: string): Promise<string | Buffer> {
        const filter = parseExportEndpointRequest(body);
        if (workflow.strategy.access === 'public' && filter.filter.expressions.some(expression => expression.key === 'tag_id')) {
            throw createForbiddenHttpException('Tag filters are internal.');
        }
        const exporter = await this.moduleRef.create(JSONataExportService);
        await exporter.setUp(workflow);
        return exporter.export(filter, undefined, username, false,
            (publications, paths) => this.publicationFilters.applyPaths(publications, paths));
    }
}
