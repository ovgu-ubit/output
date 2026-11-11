import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AccessGuard } from '../../authorization/access.guard';
import { ExportWorkflow } from '../ExportWorkflow.entity';
import { ExportEndpointService } from './export-endpoint.service';

export type ExportEndpointHttpRequest = Request & {
    exportWorkflow: ExportWorkflow;
    user?: { username?: string };
};

@Injectable()
export class ExportEndpointGuard implements CanActivate {
    constructor(private readonly endpoints: ExportEndpointService, private readonly access: AccessGuard) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<ExportEndpointHttpRequest>();
        request.exportWorkflow = await this.endpoints.resolve(request.params.name as string);
        if (request.exportWorkflow.strategy.access === 'public') return true;
        return this.access.canActivate(context);
    }
}
