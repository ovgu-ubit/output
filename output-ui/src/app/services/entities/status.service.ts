import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Status } from '../../../../../output-interfaces/Publication';
import { EntityService } from 'src/app/services/entities/service.interface';
import { RuntimeConfigService } from '../runtime-config.service';

@Injectable({
  providedIn: 'root'
})
export class StatusService implements EntityService<Status, Status> {
  
  constructor(private http: HttpClient, private runtimeConfigService:RuntimeConfigService) { }

  public getAll() {
    return this.http.get<Status[]>(this.runtimeConfigService.getValue("api") + 'status', { withCredentials: true });
  }
  public index(reporting_year:number) {
    return this.getAll();
  }
  public getOne(id:number) {
    return this.http.get<Status>(this.runtimeConfigService.getValue("api") + 'status/one?id='+id, { withCredentials: true });
  }
  public add(ge:Status) {
    return this.http.post<Status>(this.runtimeConfigService.getValue("api") + 'status', ge, { withCredentials: true });
  }
  public update(ge:Status) {
    return this.http.put<Status>(this.runtimeConfigService.getValue("api") + 'status', ge, { withCredentials: true });
  }
  public delete(ids:number[]) {
    return this.http.delete<Status[]>(this.runtimeConfigService.getValue("api") + 'status', { withCredentials: true, body: ids.map(e => ({ id: e })) });
  }
}
