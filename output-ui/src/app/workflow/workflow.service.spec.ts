import type { MockedObject } from "vitest";
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of, throwError } from 'rxjs';
import { ImportWorkflow, WorkflowReport, WorkflowType } from '@output/interfaces';
import { RuntimeConfigService } from '../services/runtime-config.service';
import { WorkflowService } from './workflow.service';

describe('WorkflowService', () => {
    let http: MockedObject<Pick<HttpClient, 'get' | 'post' | 'delete'>>;
    let runtimeConfigService: MockedObject<Pick<RuntimeConfigService, 'getValue'>>;
    let service: WorkflowService;

    beforeEach(() => {
        http = {
            get: vi.fn().mockName("HttpClient.get"),
            post: vi.fn().mockName("HttpClient.post"),
            delete: vi.fn().mockName("HttpClient.delete")
        };
        runtimeConfigService = {
            getValue: vi.fn().mockName("RuntimeConfigService.getValue")
        };
        runtimeConfigService.getValue.mockReturnValue('http://api/');

        service = new WorkflowService(
            http as unknown as HttpClient,
            runtimeConfigService as unknown as RuntimeConfigService
        );
    });

    it('keeps published workflow lists available when the latest report lookup fails', async () => {
        const workflow: ImportWorkflow = {
            id: 1,
            label: 'Import workflow',
            published_at: new Date('2026-03-20T10:00:00.000Z'),
        };

        http.get.mockImplementation(((url: string) => {
            if (url === 'http://api/workflow/import') {
                return of([workflow]);
            }
            if (url === `http://api/workflow/${WorkflowType.IMPORT}/1/workflow-reports?limit=1`) {
                return throwError(() => new Error('report lookup failed'));
            }
            throw new Error(`Unexpected URL: ${url}`);
        }) as any);

        const workflows = await firstValueFrom(service.getAll());

        expect(workflows).toEqual([workflow]);
        expect(http.get).toHaveBeenCalledWith('http://api/workflow/import', { withCredentials: true });
        expect(http.get).toHaveBeenCalledWith(`http://api/workflow/${WorkflowType.IMPORT}/1/workflow-reports?limit=1`, { withCredentials: true });
    });

    it('appends limit and offset when requesting paged workflow reports', async () => {
        const reports = [{ id: 11 }] as WorkflowReport[];
        http.get.mockReturnValue(of(reports));

        const result = await firstValueFrom(service.getWorkflowReports(7, WorkflowType.EXPORT, { limit: 5, offset: 10 }));

        expect(result).toBe(reports);
        expect(http.get).toHaveBeenCalledWith(`http://api/workflow/${WorkflowType.EXPORT}/7/workflow-reports?limit=5&offset=10`, { withCredentials: true });
    });

    it('starts an import with the supplied quick-start parameters', async () => {
        http.post.mockReturnValue(of({ status: 'started', dry_run: false }));

        await firstValueFrom(service.run(7, 2026, true, false));

        expect(http.post).toHaveBeenCalledWith('http://api/workflow/import/7/run', { reporting_year: 2026, update: true, dry_run: false }, { withCredentials: true });
    });

    it('posts an authenticated import stop request and preserves the backend result', async () => {
        http.post.mockReturnValue(of({ state: 'interrupted', reportId: 71 }));
        expect(await firstValueFrom(service.stopImport(7))).toEqual({ state: 'interrupted', reportId: 71 });
        expect(http.post).toHaveBeenCalledWith('http://api/workflow/import/7/stop', {}, { withCredentials: true });
    });

    it('includes the reporting year in multipart file imports', async () => {
        const file = new File(['title'], 'import.csv', { type: 'text/csv' });
        http.post.mockReturnValue(of({ status: 'started', dry_run: false }));

        await firstValueFrom(service.run(8, 2026, true, false, file));

        const body = vi.mocked(http.post).mock.lastCall[1] as FormData;
        expect(vi.mocked(http.post).mock.lastCall[0]).toBe('http://api/workflow/import/8/run');
        expect(body.get('file')).toBe(file);
        expect(body.get('reporting_year')).toBe('2026');
        expect(body.get('update')).toBe('true');
        expect(body.get('dry_run')).toBe('false');
    });
});
