import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EntityService } from 'src/app/services/entities/service.interface';
import { RuntimeConfigService } from '../services/runtime-config.service';
import { ImportWorkflow, Workflow } from '../../../../output-interfaces/Workflow';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService implements EntityService<Workflow, Workflow> {

  
  constructor(private http: HttpClient, private runtimeConfigService:RuntimeConfigService) { }

  public getAll() {
    return this.http.get<ImportWorkflow[]>(this.runtimeConfigService.getValue("api") + 'workflow/import', { withCredentials: true });
  }
  public index() {
    return this.getAll();
  }
  public getOne(id:number) {
    return this.http.get<Workflow>(this.runtimeConfigService.getValue("api") + 'workflow/one?id='+id, { withCredentials: true });
  }
  public add(ge:Workflow) {
    return this.http.post<Workflow>(this.runtimeConfigService.getValue("api") + 'workflow', ge, { withCredentials: true });
  }
  public update(ge:Workflow) {
    return this.http.put<Workflow>(this.runtimeConfigService.getValue("api") + 'workflow', ge, { withCredentials: true });
  }
  public delete(ids:number[]) {
    return this.http.delete<Workflow[]>(this.runtimeConfigService.getValue("api") + 'workflow', { withCredentials: true, body: ids.map(e => ({id:e})) });
  }
}
