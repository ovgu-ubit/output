import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AppConfigService } from '../config/app-config.service';
import { ImportWorkflow } from './ImportWorkflow.entity';
import { Repository } from 'typeorm';
import { JSONataImportService } from './import/jsonata-import';
import { validateImportWorkflow } from './import-workflow.schema';

@Injectable()
export class WorkflowService {

    constructor(
        @InjectRepository(ImportWorkflow) private importRepository: Repository<ImportWorkflow>,
        private configService: AppConfigService, private importService: JSONataImportService) { }


    getImports() {
        return this.importRepository.find();
    }

    getImport(id?:number) {
        return this.importRepository.findOneBy({id});
    }

    saveImport(workflow:ImportWorkflow) {
        let validated = validateImportWorkflow(workflow);
        if (validated) return this.importRepository.save(workflow);
    }

    async startImport(id: number) {
        const importDef = await this.importRepository.findOneBy({ id });
        await this.importService.setReportingYear("2024");
        await this.importService.setUp(importDef);
        await this.importService.import(false);
    }
}

