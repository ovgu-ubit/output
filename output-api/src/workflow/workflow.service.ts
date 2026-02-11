import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, IsNull, Not, Repository } from 'typeorm';
import { UpdateMapping } from '../../../output-interfaces/Config';
import { ImportWorkflowTestResult, Strategy } from '../../../output-interfaces/Workflow';
import { AppConfigService } from '../config/app-config.service';
import { validateImportWorkflow } from './import-workflow.schema';
import { JSONataImportService } from './import/jsonata-import';
import { ImportWorkflow } from './ImportWorkflow.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WorkflowService {

    constructor(
        @InjectRepository(ImportWorkflow) private importRepository: Repository<ImportWorkflow>,
        private configService: AppConfigService, private importService: JSONataImportService) { }


    getImports(type?: 'draft' | 'published' | 'archived') {
        let options = {};
        if (type === 'draft') options = { where: { published_at: IsNull(), deleted_at: IsNull() } };
        else if (type === 'published') options = { where: { published_at: Not(IsNull()), deleted_at: IsNull() } };
        else if (type === 'archived') options = { where: { deleted_at: Not(IsNull())}, withDeleted: true };

        return this.importRepository.find(options);
    }

    async getImport(id?: number) {
        const res = await this.importRepository.findOne({where: {id}, withDeleted: true });
        if (!res) throw new NotFoundException();
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

    async importImport(file: Express.Multer.File) {
        let workflow: ImportWorkflow;
        try {
            workflow = JSON.parse(file.buffer.toString('utf-8'));
        } catch {
            throw new BadRequestException('invalid json');
        }

        const lastVersion = await this.importRepository.findOne({ where: { workflow_id: workflow.workflow_id }, order: { version: 'DESC' } })
        const nextVersion = lastVersion ? lastVersion.version + 1 : 1;

        const obj: ImportWorkflow = {
            workflow_id: workflow.workflow_id,
            label: workflow.label,
            version: nextVersion,
            description: workflow.description,
            strategy_type: workflow.strategy_type,
            strategy: workflow.strategy,
            mapping: workflow.mapping,
            update_config: workflow.update_config
        }

        return this.importRepository.save(obj);
    }

    async saveImport(workflow: ImportWorkflow) {
        let toSave = workflow;
        if (workflow.id) { //update
            const db = await this.importRepository.findOneBy({ id: workflow.id })
            if (!db) throw new BadRequestException("Error: ID of workflow to update does not exist");
            if (db.published_at) {
                const isArchiving = !!workflow.deleted_at; // optional: plus equality checks
                if (!isArchiving) throw new BadRequestException("Error: workflow to update has already been published");
                toSave = { ...db, deleted_at: new Date() };
            } else if (!db.published_at && workflow.published_at) {
                //does another published version exist?
                const other = await this.importRepository.findOneBy({ workflow_id: workflow.workflow_id, published_at: Not(IsNull()), id: Not(workflow.id) })
                if (other) throw new BadRequestException("Error: there is already a published version of this workflow. Archive it first.");
                else toSave = { ...db, published_at: new Date() }
            } else {
                toSave = { ...db, ...workflow };
            }
        } else {
            toSave = {
                ...toSave,
                workflow_id: workflow.workflow_id ?? uuidv4(),
                version: workflow.version ?? 1,
                id: undefined,
                created_at: undefined,
                published_at: undefined,
                deleted_at: undefined,
                modified_at: undefined,
                update_config: workflow.update_config ?? this.importService.getUpdateMapping()
            }
        }
        const validated = validateImportWorkflow(toSave);
        if (validated) return this.importRepository.save(toSave);
    }

    async startImport(id: number, reporting_year: number, ids: number[], file: Express.Multer.File, update: boolean, user?: string, dryRun = false) {
        const importDef = await this.importRepository.findOneBy({ id });

        if (!importDef) throw new BadRequestException('Error: workflow not found');
        if (!importDef.published_at || importDef.deleted_at) {
            throw new BadRequestException('Error: only published workflows can be executed');
        }
        if (importDef.strategy_type === Strategy.URL_QUERY_OFFSET) {
            await this.importService.setUp(importDef, update ? importDef.update_config : undefined);
            await this.importService.setReportingYear(reporting_year + "");
            await this.importService.import(update, user, dryRun);
        }
        else if (importDef.strategy_type === Strategy.URL_DOI) {
            await this.importService.setUp(importDef, importDef.update_config);
            if (ids && ids.length > 0) {
                this.importService.enrich_whereClause = { where: { id: In(ids) } };
            } else if (reporting_year) {
                const beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
                const endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
                this.importService.enrich_whereClause = { where: { pub_date: Between(beginDate, endDate) } };
                this.importService.setReportingYear(reporting_year + "")
            } else throw new BadRequestException('neither reporting_year nor ids are given')
            await this.importService.enrich(user, dryRun);
        } else if (importDef.strategy_type === Strategy.FILE_UPLOAD) {
            await this.importService.setUp(importDef, importDef.update_config);
            if (file) await this.importService.loadFile(update, file, user, dryRun);
            else throw new BadRequestException('no file supported')
        }
    }

    async testImport(id: number, pos = 1): Promise<ImportWorkflowTestResult> {
        const importDef = await this.importRepository.findOneBy({ id });
        if (!importDef) throw new NotFoundException();

        await this.importService.setReportingYear("2024");
        await this.importService.setUp(importDef, importDef.update_config);
        return await this.importService.test(pos);
    }

    async isLocked(id: number): Promise<boolean> {
        const db = await this.importRepository.findOneBy({ id })
        if (!db) throw new NotFoundException();
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

    async status(_id: number) {
        return this.importService.status();
    }

    getUpdateMapping(id: number) {
        return this.importRepository.findOneBy({ id }).then(w => w.update_config).catch(err => {
            throw new NotFoundException(err.message);
        });
    }

    async setUpdateMapping(id: number, mapping: UpdateMapping) {
        const w = await this.importRepository.findOneBy({ id });
        if (!w) throw new NotFoundException();
        return this.importRepository.save({ id, update_config: mapping })
    }
}

