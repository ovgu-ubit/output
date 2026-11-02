import { GUARDS_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { WorkflowType } from '@output/interfaces';
import { paginateIndexQuery } from './index-page';
import { WorkflowService } from '../workflow/workflow.service';
import { WorkflowController } from '../workflow/WorkflowController';
import { WorkflowIndexPageRequestDto } from '../workflow/dto/workflow-index-page.dto';
import { PublicationService } from '../publication/core/publication.service';
import { PublicationController } from '../publication/core/PublicationController';
import { DuplicateIndexPageRequestDto } from '../publication/core/dto/duplicate-index-page.dto';
import { AccessGuard } from '../authorization/access.guard';

jest.mock('./index-page', () => ({
    ...jest.requireActual('./index-page'),
    paginateIndexQuery: jest.fn(),
}));

describe('Workflow and duplicate index pages', () => {
    const page = { items: [{ id: 21 }], total: 25, page: 2, page_size: 10 };
    const builder = () => {
        const query: Record<string, jest.Mock> = {};
        for (const name of ['withDeleted', 'select', 'addSelect', 'where', 'andWhere', 'setParameter', 'from', 'distinctOn', 'orderBy', 'addOrderBy']) {
            query[name] = jest.fn().mockReturnValue(query);
        }
        const reports = { ...query };
        query.leftJoin = jest.fn((build) => { build(reports); return query; });
        return { query, reports };
    };
    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(paginateIndexQuery).mockResolvedValue(page);
    });

    it.each([
        ['getImportPage', 'importRepository', WorkflowType.IMPORT, 'workflowId'],
        ['getExportPage', 'exportRepository', WorkflowType.EXPORT, 'exportWorkflowId'],
        ['getValidationPage', 'validationRepository', WorkflowType.VALIDATION, 'validationWorkflowId'],
    ] as const)('pages %s with the latest report selected before pagination', async (method, repository, type, foreignKey) => {
        const { query, reports } = builder();
        const service = Object.create(WorkflowService.prototype) as WorkflowService;
        Object.assign(service, { [repository]: { createQueryBuilder: () => query } });
        const request = { type: 'published' as const, q: 'finished', sort: [{ key: 'last_run_status' as const, direction: 'asc' as const }] };

        await expect(service[method](request)).resolves.toBe(page);
        expect(query.where).toHaveBeenCalledWith('workflow.deleted_at IS NULL');
        expect(query.andWhere).toHaveBeenCalledWith('workflow.published_at IS NOT NULL');
        expect(reports.distinctOn).toHaveBeenCalledWith([`report."${foreignKey}"`]);
        expect(reports.addOrderBy).toHaveBeenCalledWith('report.started_at', 'DESC');
        expect(reports.addOrderBy).toHaveBeenCalledWith('report.id', 'DESC');
        expect(reports.where).toHaveBeenCalledWith('report.workflow_type = :indexWorkflowType', { indexWorkflowType: type });
        expect(query.leftJoin).toHaveBeenCalledWith(expect.any(Function), 'last_report', expect.stringContaining('workflow.published_at IS NOT NULL AND workflow.deleted_at IS NULL'));
        expect(paginateIndexQuery).toHaveBeenCalledWith(query, request);
        expect(query.addSelect).not.toHaveBeenCalledWith('workflow.strategy', expect.anything());
    });

    it.each(['draft', 'archived'] as const)('keeps the %s workflow scope', async type => {
        const { query } = builder();
        const service = Object.create(WorkflowService.prototype) as WorkflowService;
        Object.assign(service, { importRepository: { createQueryBuilder: () => query } });
        await service.getImportPage({ type });
        expect(query.withDeleted).toHaveBeenCalled();
        if (type === 'archived') expect(query.where).toHaveBeenCalledWith('workflow.deleted_at IS NOT NULL');
        else expect(query.andWhere).toHaveBeenCalledWith('workflow.published_at IS NULL');
    });

    it.each([false, true])('keeps the duplicate soft-delete scope: %s', async soft => {
        const { query } = builder();
        const service = Object.create(PublicationService.prototype) as PublicationService;
        Object.assign(service, { dataSource: { getRepository: () => ({ createQueryBuilder: () => query }) } });
        await expect(service.getDuplicatePage({ soft })).resolves.toBe(page);
        if (soft) {
            expect(query.withDeleted).toHaveBeenCalled();
            expect(query.where).toHaveBeenCalledWith('duplicate.delete_date IS NOT NULL');
        } else expect(query.withDeleted).not.toHaveBeenCalled();
        expect(paginateIndexQuery).toHaveBeenCalledWith(query, { soft });
    });

    it('requires administrator access to all workflow page endpoints and delegates the request', () => {
        const service = { getImportPage: jest.fn(), getExportPage: jest.fn(), getValidationPage: jest.fn() };
        const controller = new WorkflowController({} as never, {} as never, service as never, {} as never);
        for (const [method, target] of [['importIndexPage', 'getImportPage'], ['exportIndexPage', 'getExportPage'], ['validationIndexPage', 'getValidationPage']] as const) {
            controller[method]({ type: 'archived' } as WorkflowIndexPageRequestDto);
            expect(service[target]).toHaveBeenCalledWith({ type: 'archived' });
            expect(Reflect.getMetadata('permissions', controller[method])).toEqual([{ role: 'admin', app: 'output' }]);
            expect(Reflect.getMetadata(GUARDS_METADATA, controller[method])).toContain(AccessGuard);
        }
        expect(Reflect.getMetadata(GUARDS_METADATA, PublicationController.prototype.duplicateIndexPage)).toContain(AccessGuard);
    });

    it('validates state and soft-delete transport parameters', async () => {
        expect(await validate(plainToInstance(WorkflowIndexPageRequestDto, { type: 'draft', page: 0 }))).toEqual([]);
        expect(await validate(plainToInstance(WorkflowIndexPageRequestDto, { type: 'invalid' }))).not.toEqual([]);
        expect(await validate(plainToInstance(DuplicateIndexPageRequestDto, { soft: true }))).toEqual([]);
        expect(await validate(plainToInstance(DuplicateIndexPageRequestDto, { soft: 'false' }))).not.toEqual([]);
    });
});
