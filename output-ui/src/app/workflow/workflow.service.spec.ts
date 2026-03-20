import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of, throwError } from 'rxjs';
import { ImportWorkflow, WorkflowType } from '../../../../output-interfaces/Workflow';
import { RuntimeConfigService } from '../services/runtime-config.service';
import { WorkflowService } from './workflow.service';

describe('WorkflowService', () => {
  let http: jasmine.SpyObj<HttpClient>;
  let runtimeConfigService: jasmine.SpyObj<RuntimeConfigService>;
  let service: WorkflowService;

  beforeEach(() => {
    http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get', 'post', 'delete']);
    runtimeConfigService = jasmine.createSpyObj<RuntimeConfigService>('RuntimeConfigService', ['getValue']);
    runtimeConfigService.getValue.and.returnValue('http://api/');

    service = new WorkflowService(http, runtimeConfigService);
  });

  it('keeps published workflow lists available when the latest report lookup fails', async () => {
    const workflow: ImportWorkflow = {
      id: 1,
      label: 'Import workflow',
      published_at: new Date('2026-03-20T10:00:00.000Z'),
    };

    http.get.and.callFake(((url: string) => {
      if (url === 'http://api/workflow/import') {
        return of([workflow]);
      }
      if (url === `http://api/workflow/${WorkflowType.IMPORT}/1/workflow-reports`) {
        return throwError(() => new Error('report lookup failed'));
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as any);

    const workflows = await firstValueFrom(service.getAll());

    expect(workflows).toEqual([workflow]);
    expect(http.get).toHaveBeenCalledWith('http://api/workflow/import', { withCredentials: true });
    expect(http.get).toHaveBeenCalledWith(
      `http://api/workflow/${WorkflowType.IMPORT}/1/workflow-reports`,
      { withCredentials: true }
    );
  });
});
