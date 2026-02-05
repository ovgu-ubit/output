import { BadRequestException, Injectable, Options } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AppConfigService } from '../config/app-config.service';
import { ImportWorkflow } from './ImportWorkflow.entity';
import { IsNull, Not, Repository } from 'typeorm';
import { JSONataImportService } from './import/jsonata-import';
import { validateImportWorkflow } from './import-workflow.schema';
import { ImportWorkflowTestResult } from '../../../output-interfaces/Workflow';

@Injectable()
export class WorkflowService {

    constructor(
        @InjectRepository(ImportWorkflow) private importRepository: Repository<ImportWorkflow>,
        private configService: AppConfigService, private importService: JSONataImportService) { }


    getImports(type?:'draft'|'published'|'archived') {
        let options = {};
        if (type === 'draft') options = {where:  {published_at: IsNull(), deleted_at: IsNull()}};
        else if (type === 'published') options = {where:  {published_at: Not(IsNull()), deleted_at: IsNull()}};
        else if (type === 'archived') options = {where:  {deleted_at: Not(IsNull())}};
        
        return this.importRepository.find(options);
    }

    getImport(id?:number) {
        return this.importRepository.findOneBy({id});
    }

    async saveImport(workflow:ImportWorkflow) {
        if (workflow.id) {
            const db = await this.importRepository.findOneBy({id:workflow.id})
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

    async startImport(id: number, reporting_year:string, user?: string, dryRun = false) {
        const importDef = await this.importRepository.findOneBy({ id });

        if (!importDef) throw new BadRequestException('Error: workflow not found');
        if (!importDef.published_at || importDef.deleted_at) {
            throw new BadRequestException('Error: only published workflows can be executed');
        }
        await this.importService.setReportingYear(reporting_year);
        await this.importService.setUp(importDef);
        await this.importService.import(false, user, dryRun);
    }

    async testImport(id: number):Promise<ImportWorkflowTestResult> {
        const importDef = await this.importRepository.findOneBy({ id });
        
        await this.importService.setReportingYear("2024");
        await this.importService.setUp(importDef);
        return await this.importService.test(1);
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

    async status(id:number) {
        return this.importService.status;
    }
}

