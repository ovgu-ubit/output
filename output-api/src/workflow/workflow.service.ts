import { BadRequestException, Injectable, NotFoundException, Options } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AppConfigService } from '../config/app-config.service';
import { ImportWorkflow } from './ImportWorkflow.entity';
import { Between, In, IsNull, Not, Repository } from 'typeorm';
import { JSONataImportService } from './import/jsonata-import';
import { validateImportWorkflow } from './import-workflow.schema';
import { ImportWorkflowTestResult, Strategy } from '../../../output-interfaces/Workflow';
import { UpdateMapping } from '../../../output-interfaces/Config';

@Injectable()
export class WorkflowService {

    constructor(
        @InjectRepository(ImportWorkflow) private importRepository: Repository<ImportWorkflow>,
        private configService: AppConfigService, private importService: JSONataImportService) { }


    getImports(type?: 'draft' | 'published' | 'archived') {
        let options = {};
        if (type === 'draft') options = { where: { published_at: IsNull(), deleted_at: IsNull() } };
        else if (type === 'published') options = { where: { published_at: Not(IsNull()), deleted_at: IsNull() } };
        else if (type === 'archived') options = { where: { deleted_at: Not(IsNull()) } };

        return this.importRepository.find(options);
    }

    async getImport(id?: number) {
        const res = await this.importRepository.findOneBy({ id });
        if (res.published_at || res.deleted_at) return res;
        else if (!res.locked_at) {
            await this.saveImport({
                id: res.id,
                locked_at: new Date()
            });
        } else if ((new Date().getTime() - res.locked_at.getTime()) > await this.configService.get('lock_timeout') * 60 * 1000) {
            await this.saveImport({
                id: res.id,
                locked_at: null
            });
            return this.importRepository.findOneBy({ id })
        }
        return res;
    }

    async saveImport(workflow: ImportWorkflow) {
        if (workflow.id) {
            const db = await this.importRepository.findOneBy({ id: workflow.id })
            if (!db) throw new BadRequestException("Error: ID of workflow to update does not exist");
            if (db.published_at) {
                const isArchiving = !!workflow.deleted_at
                    && workflow.label === db.label
                    && workflow.version === db.version
                    && workflow.workflow_id === db.workflow_id
                    && workflow.description === db.description
                    && workflow.mapping === db.mapping
                    && workflow.strategy_type === db.strategy_type
                    && JSON.stringify(workflow.strategy) === JSON.stringify(db.strategy)
                    && !!workflow.published_at;

                if (!isArchiving) throw new BadRequestException("Error: workflow to update has already been published");
            }
        }
        const validated = validateImportWorkflow(workflow);
        if (validated) return this.importRepository.save(workflow);
    }

    async startImport(id: number, reporting_year: number, ids: number[], update: boolean, user?: string, dryRun = false) {
        const importDef = await this.importRepository.findOneBy({ id });

        if (!importDef) throw new BadRequestException('Error: workflow not found');
        if (!importDef.published_at || importDef.deleted_at) {
            throw new BadRequestException('Error: only published workflows can be executed');
        }
        if (importDef.strategy_type === Strategy.URL_QUERY_OFFSET) {
            await this.importService.setUp(importDef, update ? importDef.update_config : undefined);
            await this.importService.setReportingYear(reporting_year +"");
            await this.importService.import(update, user, dryRun);
        }
        else if (importDef.strategy_type === Strategy.URL_DOI) {
            await this.importService.setUp(importDef, importDef.update_config);
            if (ids && ids.length >= 0) {
                this.importService.enrich_whereClause = { where: { id: In(ids) } };
            } else {
                const beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
                const endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
                this.importService.enrich_whereClause = { where: { pub_date: Between(beginDate, endDate) } };
                this.importService.setReportingYear(reporting_year +"")
            }
            await this.importService.enrich(user, dryRun);
        }
    }

    async testImport(id: number): Promise<ImportWorkflowTestResult> {
        const importDef = await this.importRepository.findOneBy({ id });

        await this.importService.setReportingYear("2024");
        await this.importService.setUp(importDef, importDef.update_config);
        return await this.importService.test(1);
    }

    async isLocked(id: number): Promise<boolean> {
        const db = await this.importRepository.findOneBy({ id })
        if (!db.locked_at) return false;
        else if ((new Date().getTime() - db.locked_at.getTime()) > await this.configService.get('lock_timeout') * 60 * 1000) return false;
        else return true;
    }

    async deleteImports(ids: number[]) {
        const workflows = await this.importRepository.findBy(ids.map(id => ({ id })));
        if (workflows.length !== ids.length) {
            throw new BadRequestException('Error: at least one workflow ID does not exist');
        }
        if (workflows.some((workflow) => !!workflow.published_at || !!workflow.deleted_at)) {
            throw new BadRequestException('Error: only draft workflows can be deleted');
        }
        return this.importRepository.remove(workflows);
    }

    async status(id: number) {
        return this.importService.status();
    }

    getUpdateMapping(id: number) {
        return this.importRepository.findOneBy({ id }).then(w => w.update_config)
    }

    async setUpdateMapping(id: number, mapping: UpdateMapping) {
        const w = await this.importRepository.findOneBy({ id });
        if (!w) throw new NotFoundException();
        return this.importRepository.save({ id, update_config: mapping })
    }
}

