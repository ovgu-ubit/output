import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EntityService } from 'src/app/services/entities/service.interface';
import { RuntimeConfigService } from '../services/runtime-config.service';
import { ImportWorkflow, ImportWorkflowTestResult, Workflow, WorkflowReport } from '../../../../output-interfaces/Workflow';
import { concatMap, firstValueFrom, forkJoin, interval, map, Observable, of } from 'rxjs';
import { UpdateMapping } from '../../../../output-interfaces/Config';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService implements EntityService<Workflow, Workflow> {


  constructor(private http: HttpClient, private runtimeConfigService: RuntimeConfigService) { }

  public getAll() {
    return this.http.get<ImportWorkflow[]>(this.runtimeConfigService.getValue("api") + 'workflow/import', { withCredentials: true })
      .pipe(concatMap((workflows) => this.attachLatestReports(workflows)));
  }
  public index(reporting_year: number, options?: { type: 'draft' | 'published' | 'archived' }) {
    if (options) {
      return this.http.get<ImportWorkflow[]>(this.runtimeConfigService.getValue("api") + 'workflow/import?type=' + options.type, { withCredentials: true })
        .pipe(concatMap((workflows) => this.attachLatestReports(workflows)));
    }
    return this.http.get<ImportWorkflow[]>(this.runtimeConfigService.getValue("api") + 'workflow/import', { withCredentials: true })
      .pipe(concatMap((workflows) => this.attachLatestReports(workflows)));
  }
  public getOne(id: number) {
    return this.http.get<ImportWorkflow>(this.runtimeConfigService.getValue("api") + 'workflow/import/' + id, { withCredentials: true });
  }
  public isLocked(id: number) {
    return this.http.get<boolean>(this.runtimeConfigService.getValue("api") + 'workflow/import/' + id + '/locked', { withCredentials: true });
  }
  public getConfig(id: number) {
    return this.http.get<UpdateMapping>(this.runtimeConfigService.getValue("api") + 'workflow/import/' + id + '/config', { withCredentials: true })
  }
  public setConfig(id: number, mapping: UpdateMapping) {
    return this.http.post<UpdateMapping>(this.runtimeConfigService.getValue("api") + 'workflow/import/' + id + '/config', { mapping }, { withCredentials: true })
  }
  public export(id: number) {
    return this.http.get(this.runtimeConfigService.getValue("api") + 'workflow/import/' + id + '/export', { withCredentials: true, observe: 'response', responseType: 'blob' as const });
  }
  public test(id: number, pos = 1) {
    return this.http.get<ImportWorkflowTestResult>(this.runtimeConfigService.getValue("api") + 'workflow/import/' + id + '/test?pos='+pos, { withCredentials: true });
  }
  public getWorkflowReports(id: number) {
    return this.http.get<WorkflowReport[]>(this.runtimeConfigService.getValue("api") + 'workflow/import/' + id + '/workflow-reports', { withCredentials: true });
  }
  public getWorkflowReport(reportId: number) {
    return this.http.get<WorkflowReport>(this.runtimeConfigService.getValue("api") + 'workflow/workflow-report/' + reportId, { withCredentials: true });
  }
  public deleteWorkflowReport(reportId: number) {
    return this.http.delete(this.runtimeConfigService.getValue("api") + 'workflow/workflow-report/' + reportId, { withCredentials: true });
  }
  public run(id: number, reporting_year: number, update: boolean, dryRun = false, file?: File) {
    let body;
    if (file) {
      body = new FormData();
      body.append("file", file)
      body.append("update", update)
      body.append("dry_run", dryRun)
    } else body = {
      dry_run: dryRun,
      reporting_year,
      update
    }
    return this.http.post<{ status: string; dry_run: boolean }>(
      this.runtimeConfigService.getValue("api") + 'workflow/import/' + id + '/run',
      body,
      { withCredentials: true }
    );
  }
  async isRunning(id: number) {
    if (!id) return false;
    let resp = await firstValueFrom(this.http.get<{ progress: number, status: string }>(this.runtimeConfigService.getValue("api") + 'workflow/import/' + id + '/run', { withCredentials: true }))
    return resp?.progress != 0
  }
  getProgress(id: number): Observable<{ progress: number, status: string }> {
    let timer = interval(500);
    return timer.pipe(concatMap(data => {
      //console.log(new Date())
      return this.http.get<{ progress: number, status: string }>(this.runtimeConfigService.getValue("api") + 'workflow/import/' + id + '/run', { withCredentials: true })
    }))
  }
  getStatus(id: number): Observable<{ progress: number, status: string }> {
    return this.http.get<{ progress: number, status: string }>(this.runtimeConfigService.getValue("api") + 'workflow/import/' + id + '/run', { withCredentials: true })
  }

  public add(ge: ImportWorkflow) {
    return this.http.post<ImportWorkflow>(this.runtimeConfigService.getValue("api") + 'workflow/import', ge, { withCredentials: true });
  }
  public update(ge: ImportWorkflow) {
    return this.http.post<ImportWorkflow>(this.runtimeConfigService.getValue("api") + 'workflow/import', ge, { withCredentials: true });
  }
  public delete(ids: number[]) {
    return this.http.delete<ImportWorkflow[]>(this.runtimeConfigService.getValue("api") + 'workflow/import', { withCredentials: true, body: ids.map(e => ({ id: e })) });
  }

  public importWorkflow(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ImportWorkflow>(
      this.runtimeConfigService.getValue("api") + 'workflow/import/import',
      formData,
      { withCredentials: true }
    );
  }

  private attachLatestReports(workflows: ImportWorkflow[]): Observable<ImportWorkflow[]> {
    if (!workflows?.length) return of([]);

    return forkJoin(workflows.map((workflow) => {
      if (!workflow.id) return of(workflow);

      return this.getWorkflowReports(workflow.id).pipe(map((reports) => {
        const lastReport = reports?.[0];
        return {
          ...workflow,
          last_run_status: lastReport?.status,
          last_run_finished_at: lastReport?.finished_at,
          last_run_report_id: lastReport?.id,
          last_run_log_link: lastReport?.id ? `/workflow/publication_import/${workflow.id}/logs/${lastReport.id}` : undefined,
        };
      }));
    }));
  }
}
