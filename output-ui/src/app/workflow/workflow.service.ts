import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EntityService } from 'src/app/services/entities/service.interface';
import { RuntimeConfigService } from '../services/runtime-config.service';
import { ImportWorkflow, ImportWorkflowTestResult, Workflow } from '../../../../output-interfaces/Workflow';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService implements EntityService<Workflow, Workflow> {

  
  constructor(private http: HttpClient, private runtimeConfigService:RuntimeConfigService) { }

  public getAll() {
    return this.http.get<ImportWorkflow[]>(this.runtimeConfigService.getValue("api") + 'workflow/import', { withCredentials: true });
  }
  public index(reporting_year:number, options?: {type: 'draft'|'published'|'archived'}) {
    if (options) return this.http.get<ImportWorkflow[]>(this.runtimeConfigService.getValue("api") + 'workflow/import?type='+options.type, { withCredentials: true });
    return this.http.get<ImportWorkflow[]>(this.runtimeConfigService.getValue("api") + 'workflow/import', { withCredentials: true });
  }
  public getOne(id:number) {
    return this.http.get<ImportWorkflow>(this.runtimeConfigService.getValue("api") + 'workflow/import/'+id, { withCredentials: true });
  }
  public export(id:number) {
    return this.http.get(this.runtimeConfigService.getValue("api") + 'workflow/import/'+id+'/export', { withCredentials: true, observe: 'response',  responseType: 'blob' as const });
  }
  public test(id:number) {
    return this.http.get<ImportWorkflowTestResult>(this.runtimeConfigService.getValue("api") + 'workflow/import/'+id+'/test', { withCredentials: true });
  }
  public add(ge:ImportWorkflow) {
    return this.http.post<ImportWorkflow>(this.runtimeConfigService.getValue("api") + 'workflow/import', ge, { withCredentials: true });
  }
  public update(ge:ImportWorkflow) {
    return this.http.post<ImportWorkflow>(this.runtimeConfigService.getValue("api") + 'workflow/import', ge, { withCredentials: true });
  }
  public delete(ids:number[]) {
    return this.http.delete<ImportWorkflow[]>(this.runtimeConfigService.getValue("api") + 'workflow/import', { withCredentials: true, body: ids.map(e => ({id:e})) });
  }
}
