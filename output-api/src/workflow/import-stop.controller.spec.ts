import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Response } from 'express';
import { AccessGuard } from '../authorization/access.guard';
import { EnrichController } from './EnrichController';
import { ImportController } from './ImportController';
import { WorkflowController } from './WorkflowController';
import { ImportExecutionService } from './import-execution.service';

describe('Import stop endpoints', () => {
    const request = { user: { username: 'alice' } };
    const response = () => ({ status: jest.fn() }) as unknown as Response;
    const participant = () => ({
        bindExecution: jest.fn(), notifyStop: jest.fn(async () => undefined), finalizeExecution: jest.fn(async () => undefined),
    });

    it.each([
        [WorkflowController.prototype.stop_import],
        [ImportController.prototype.stop],
        [EnrichController.prototype.stop],
    ])('protects the stop handler with the existing admin guard', handler => {
        expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(AccessGuard);
        expect(Reflect.getMetadata('permissions', handler)).toEqual([{ role: 'admin', app: 'output' }]);
    });

    it.each(['csv', 'xls', 'crossref'])('resolves %s imports, returns 202 while draining and 200 after completion', async path => {
        const executions = new ImportExecutionService();
        const controller = new ImportController({} as never, {} as never, [], {} as never, {} as never, {} as never, executions);
        jest.spyOn(controller, 'list').mockResolvedValue([{ path: 'crossref', allowed: true }]);
        let release!: () => void;
        const work = new Promise<void>(resolve => { release = resolve; });
        await executions.run(`legacy-import:${path}`, { kind: 'import', path }, participant(), async () => executions.get(`legacy-import:${path}`)!.track(work));
        const run = executions.get(`legacy-import:${path}`)!;
        const res = response();
        expect(await controller.stop(path, request, res)).toEqual({ state: 'stopping', runId: run.runId });
        expect(res.status).toHaveBeenLastCalledWith(202);
        expect(await controller.stop(path, request, res)).toEqual({ state: 'stopping', runId: run.runId });
        expect(run.stop?.by_user).toBe('alice');
        release();
        await run.completion;
        expect(await controller.stop(path, request, res)).toEqual({ state: 'not-running' });
        expect(res.status).toHaveBeenLastCalledWith(200);
        await expect(controller.stop('unknown', request, res)).rejects.toMatchObject({ status: 404 });
    });

    it('resolves enrich services independently from import services', async () => {
        const executions = new ImportExecutionService();
        const controller = new EnrichController({} as never, {} as never, [], executions);
        jest.spyOn(controller, 'list').mockResolvedValue([{ path: 'crossref', allowed: true }]);
        let release!: () => void;
        const work = new Promise<void>(resolve => { release = resolve; });
        await executions.run('legacy-enrich:crossref', { kind: 'enrich', path: 'crossref' }, participant(), async () => executions.get('legacy-enrich:crossref')!.track(work));
        const run = executions.get('legacy-enrich:crossref')!;
        const res = response();
        expect(await controller.stop('crossref', request, res)).toEqual({ state: 'stopping', runId: run.runId });
        expect(res.status).toHaveBeenCalledWith(202);
        release();
        await run.completion;
        await expect(controller.stop('unknown', request, res)).rejects.toMatchObject({ status: 404 });
    });

    it('does not stop a replacement run started while service lookup is pending', async () => {
        const executions = new ImportExecutionService();
        const controller = new ImportController({} as never, {} as never, [], {} as never, {} as never, {} as never, executions);
        let resolveLookup!: (value: { path: string; allowed: boolean }[]) => void;
        jest.spyOn(controller, 'list').mockImplementation(() => new Promise(resolve => { resolveLookup = resolve; }));
        const stopping = controller.stop('crossref', request, response());
        let release!: () => void;
        const work = new Promise<void>(resolve => { release = resolve; });
        await executions.run('legacy-import:crossref', { kind: 'import', path: 'crossref' }, participant(),
            async () => executions.get('legacy-import:crossref')!.track(work));
        const run = executions.get('legacy-import:crossref')!;
        resolveLookup([{ path: 'crossref', allowed: true }]);
        expect(await stopping).toEqual({ state: 'not-running' });
        expect(run.signal.aborted).toBe(false);
        release();
        await run.completion;
    });

    it.each(['stopping', 'not-running', 'interrupted'])('returns the workflow stop result %s with the matching status', async state => {
        const workflowService = { stopImport: jest.fn(async () => ({ state, runId: 'run-1' })) };
        const controller = new WorkflowController({} as never, {} as never, workflowService as never, {} as never);
        const res = response();
        expect(await controller.stop_import(7, request, res)).toEqual({ state, runId: 'run-1' });
        expect(workflowService.stopImport).toHaveBeenCalledWith(7, 'alice');
        expect(res.status).toHaveBeenCalledWith(state === 'stopping' ? 202 : 200);
    });
});
