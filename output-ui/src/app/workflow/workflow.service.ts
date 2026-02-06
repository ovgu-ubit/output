import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EntityService } from 'src/app/services/entities/service.interface';
import { RuntimeConfigService } from '../services/runtime-config.service';
import { ImportWorkflow, ImportWorkflowTestResult, Workflow } from '../../../../output-interfaces/Workflow';
import { concatMap, firstValueFrom, interval, Observable } from 'rxjs';
import { UpdateMapping } from '../../../../output-interfaces/Config';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService implements EntityService<Workflow, Workflow> {


  constructor(private http: HttpClient, private runtimeConfigService: RuntimeConfigService) { }

  public getAll() {
    return this.http.get<ImportWorkflow[]>(this.runtimeConfigService.getValue("api") + 'workflow/import', { withCredentials: true });
  }
  public index(reporting_year: number, options?: { type: 'draft' | 'published' | 'archived' }) {
    if (options) return this.http.get<ImportWorkflow[]>(this.runtimeConfigService.getValue("api") + 'workflow/import?type=' + options.type, { withCredentials: true });
    return this.http.get<ImportWorkflow[]>(this.runtimeConfigService.getValue("api") + 'workflow/import', { withCredentials: true });
  }
  public getOne(id: number) {
    return this.http.get<ImportWorkflow>(this.runtimeConfigService.getValue("api") + 'workflow/import/' + id, { withCredentials: true });
  }
  public isLocked(id: number) {
    return this.http.get<boolean>(this.runtimeConfigService.getValue("api") + 'workflow/import/' + id + '/locked', { withCredentials: true });
  }
  public getConfig(id: number) {
    return this.http.get<UpdateMapping>(this.runtimeConfigService.getValue("api") + 'workflow/import/' + id + '/config')
  }
  public setConfig(id: number, mapping: UpdateMapping) {
    return this.http.post<UpdateMapping>(this.runtimeConfigService.getValue("api") + 'workflow/import/' + id + '/config', { mapping })
  }
  public export(id: number) {
    return this.http.get(this.runtimeConfigService.getValue("api") + 'workflow/import/' + id + '/export', { withCredentials: true, observe: 'response', responseType: 'blob' as const });
  }
  public test(id: number) {
    return this.http.get<ImportWorkflowTestResult>(this.runtimeConfigService.getValue("api") + 'workflow/import/' + id + '/test', { withCredentials: true });
  }
  public run(id: number, reporting_year: number, update: boolean, dryRun = false) {
    return this.http.post<{ status: string; dry_run: boolean }>(
      this.runtimeConfigService.getValue("api") + 'workflow/import/' + id + '/run',
      {
        dry_run: dryRun,
        reporting_year,
        update
      },
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
}
