import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EntityService } from 'src/app/services/entities/service.interface';
import { RuntimeConfigService } from '../services/runtime-config.service';
import { SearchFilter } from '../../../../output-interfaces/Config';
import { ExportWorkflow, ImportWorkflow, ImportWorkflowTestResult, ValidationWorkflow, Workflow, WorkflowReport, WorkflowType } from '../../../../output-interfaces/Workflow';
import { catchError, concatMap, firstValueFrom, forkJoin, interval, map, Observable, of } from 'rxjs';
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
  public getWorkflowReports(
    id: number,
    workflowType: WorkflowType = WorkflowType.IMPORT,
    options?: { limit?: number, offset?: number }
  ) {
    const query = new URLSearchParams();
    if (options?.limit !== undefined) query.set('limit', `${options.limit}`);
    if (options?.offset !== undefined) query.set('offset', `${options.offset}`);
    const suffix = query.size ? `?${query.toString()}` : '';
    return this.http.get<WorkflowReport[]>(
      this.runtimeConfigService.getValue("api") + `workflow/${workflowType}/${id}/workflow-reports${suffix}`,
      { withCredentials: true }
    );
  }
  public getExportWorkflowReports(id: number) {
    return this.getWorkflowReports(id, WorkflowType.EXPORT);
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
  public runExport(id: number, filter?: { filter: SearchFilter, paths: string[] }, withMasterData = false) {
    return this.http.post(
      this.runtimeConfigService.getValue("api") + 'workflow/export/' + id + '/run',
      { filter, withMasterData },
      { withCredentials: true, observe: 'response', responseType: 'blob' as const }
    );
  }
  async isRunning(id: number, workflowType: WorkflowType = WorkflowType.IMPORT) {
    if (!id) return false;
    let resp = await firstValueFrom(this.http.get<{ progress: number, status: string }>(
      this.runtimeConfigService.getValue("api") + `workflow/${workflowType}/${id}/run`,
      { withCredentials: true }
    ))
    return resp?.progress != 0
  }
  async isExportRunning(id: number) {
    return this.isRunning(id, WorkflowType.EXPORT);
  }
  getProgress(id: number, workflowType: WorkflowType = WorkflowType.IMPORT): Observable<{ progress: number, status: string }> {
    let timer = interval(500);
    return timer.pipe(concatMap(data => {
      //console.log(new Date())
      return this.http.get<{ progress: number, status: string }>(
        this.runtimeConfigService.getValue("api") + `workflow/${workflowType}/${id}/run`,
        { withCredentials: true }
      )
    }))
  }
  getExportProgress(id: number): Observable<{ progress: number, status: string }> {
    return this.getProgress(id, WorkflowType.EXPORT);
  }
  getStatus(id: number, workflowType: WorkflowType = WorkflowType.IMPORT): Observable<{ progress: number, status: string }> {
    return this.http.get<{ progress: number, status: string }>(
      this.runtimeConfigService.getValue("api") + `workflow/${workflowType}/${id}/run`,
      { withCredentials: true }
    )
  }
  getExportStatus(id: number): Observable<{ progress: number, status: string }> {
    return this.getStatus(id, WorkflowType.EXPORT);
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
  public getAllExports() {
    return this.http.get<ExportWorkflow[]>(this.runtimeConfigService.getValue("api") + 'workflow/export', { withCredentials: true })
      .pipe(concatMap((workflows) => this.attachLatestReports(workflows, WorkflowType.EXPORT, '/workflow/publication_export')));
  }
  public getExports(options?: { type: 'draft' | 'published' | 'archived' }) {
    if (options) {
      return this.http.get<ExportWorkflow[]>(this.runtimeConfigService.getValue("api") + 'workflow/export?type=' + options.type, { withCredentials: true })
        .pipe(concatMap((workflows) => this.attachLatestReports(workflows, WorkflowType.EXPORT, '/workflow/publication_export')));
    }
    return this.getAllExports();
  }
  public getOneExport(id: number) {
    return this.http.get<ExportWorkflow>(this.runtimeConfigService.getValue("api") + 'workflow/export/' + id, { withCredentials: true });
  }
  public isExportLocked(id: number) {
    return this.http.get<boolean>(this.runtimeConfigService.getValue("api") + 'workflow/export/' + id + '/locked', { withCredentials: true });
  }
  public exportWorkflow(id: number) {
    return this.http.get(this.runtimeConfigService.getValue("api") + 'workflow/export/' + id + '/export', { withCredentials: true, observe: 'response', responseType: 'blob' as const });
  }
  public addExport(ge: ExportWorkflow) {
    return this.http.post<ExportWorkflow>(this.runtimeConfigService.getValue("api") + 'workflow/export', ge, { withCredentials: true });
  }
  public updateExport(ge: ExportWorkflow) {
    return this.http.post<ExportWorkflow>(this.runtimeConfigService.getValue("api") + 'workflow/export', ge, { withCredentials: true });
  }
  public deleteExports(ids: number[]) {
    return this.http.delete<ExportWorkflow[]>(this.runtimeConfigService.getValue("api") + 'workflow/export', { withCredentials: true, body: ids.map(e => ({ id: e })) });
  }
  public importExportWorkflow(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ExportWorkflow>(
      this.runtimeConfigService.getValue("api") + 'workflow/export/import',
      formData,
      { withCredentials: true }
    );
  }
  public getAllValidations() {
    return this.http.get<ValidationWorkflow[]>(this.runtimeConfigService.getValue("api") + 'workflow/validation', { withCredentials: true })
      .pipe(concatMap((workflows) => this.attachLatestReports(workflows, WorkflowType.VALIDATION, '/workflow/publication_validation')));
  }
  public getValidations(options?: { type: 'draft' | 'published' | 'archived' }) {
    if (options) {
      return this.http.get<ValidationWorkflow[]>(this.runtimeConfigService.getValue("api") + 'workflow/validation?type=' + options.type, { withCredentials: true })
        .pipe(concatMap((workflows) => this.attachLatestReports(workflows, WorkflowType.VALIDATION, '/workflow/publication_validation')));
    }
    return this.getAllValidations();
  }
  public getOneValidation(id: number) {
    return this.http.get<ValidationWorkflow>(this.runtimeConfigService.getValue("api") + 'workflow/validation/' + id, { withCredentials: true });
  }
  public isValidationLocked(id: number) {
    return this.http.get<boolean>(this.runtimeConfigService.getValue("api") + 'workflow/validation/' + id + '/locked', { withCredentials: true });
  }
  public unlockValidation(id: number) {
    return this.http.post<ValidationWorkflow>(this.runtimeConfigService.getValue("api") + 'workflow/validation/' + id + '/unlock', {}, { withCredentials: true });
  }
  public runValidation(id: number) {
    return this.http.post<{ status: string }>(
      this.runtimeConfigService.getValue("api") + 'workflow/validation/' + id + '/run',
      {},
      { withCredentials: true }
    );
  }
  public addValidation(obj: ValidationWorkflow) {
    return this.http.post<ValidationWorkflow>(this.runtimeConfigService.getValue("api") + 'workflow/validation', obj, { withCredentials: true });
  }
  public updateValidation(obj: ValidationWorkflow) {
    return this.http.post<ValidationWorkflow>(this.runtimeConfigService.getValue("api") + 'workflow/validation', obj, { withCredentials: true });
  }
  public deleteValidations(ids: number[]) {
    return this.http.delete<ValidationWorkflow[]>(this.runtimeConfigService.getValue("api") + 'workflow/validation', { withCredentials: true, body: ids.map(e => ({ id: e })) });
  }
  async isValidationRunning(id: number) {
    return this.isRunning(id, WorkflowType.VALIDATION);
  }
  getValidationProgress(id: number): Observable<{ progress: number, status: string }> {
    return this.getProgress(id, WorkflowType.VALIDATION);
  }
  getValidationStatus(id: number): Observable<{ progress: number, status: string }> {
    return this.getStatus(id, WorkflowType.VALIDATION);
  }

  private attachLatestReports<T extends Workflow>(
    workflows: T[],
    workflowType: WorkflowType = WorkflowType.IMPORT,
    logBasePath = '/workflow/publication_import'
  ): Observable<T[]> {
    if (!workflows?.length) return of([]);

    return forkJoin(workflows.map((workflow) => {
      // Only published (non-archived) workflows can have relevant "last run" metadata.
      // Avoid report calls for drafts because the backend report endpoint internally loads
      // the workflow and can set a draft lock as a side effect.
      if (!workflow.id || !workflow.published_at || !!workflow.deleted_at) return of(workflow);

      return this.getWorkflowReports(workflow.id, workflowType, { limit: 1 }).pipe(
        map((reports) => {
          const lastReport = reports?.[0];
          return {
            ...workflow,
            last_run_status: lastReport?.status,
            last_run_finished_at: lastReport?.finished_at,
            last_run_report_id: lastReport?.id,
            last_run_log_link: lastReport?.id ? `${logBasePath}/${workflow.id}/logs/${lastReport.id}` : undefined,
          };
        }),
        catchError(() => of(workflow))
      );
    }));
  }
}
