import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { SearchFilter } from '../../../../output-interfaces/Config';

@Injectable()
/**
 * abstract class for all exports
 */
export abstract class AbstractExportService {

    constructor() { }

    protected progress = 0;
    protected status_text = 'initialized';
    protected report: string;

    /**
     * name of the export, is used for logging and as dataSource
     */
    protected name = 'export';

    /**
     * main method for exports, should return 
     */
    public abstract export(filter?:{filter:SearchFilter, paths:string[]}, by_user?: string);

    public getName() {
        return this.name;
    }

    public status() {
        return {
            progress: this.progress,
            status: this.status_text
        };
    }
}