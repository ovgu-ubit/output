import { IndexPage, ReportingYearIndexPageRequest } from '@output/interfaces';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {  Role  } from '@output/interfaces';
import { IndexEntityService } from 'src/app/services/entities/service.interface';
import { RuntimeConfigService } from '../runtime-config.service';

@Injectable({
  providedIn: 'root'
})
export class RoleService implements IndexEntityService<Role, Role> {
  
  constructor(private http: HttpClient, private runtimeConfigService:RuntimeConfigService) { }

  public getAll() {
    return this.http.get<Role[]>(this.runtimeConfigService.getValue("api") + 'role', { withCredentials: true });
  }
  public indexPage(request: ReportingYearIndexPageRequest) {
    return this.http.post<IndexPage<Role>>(
      this.runtimeConfigService.getValue('api') + 'role/index-page', request, { withCredentials: true },
    );
  }

  public getOne(id:number) {
    return this.http.get<Role>(this.runtimeConfigService.getValue("api") + 'role/one?id='+id, { withCredentials: true });
  }
  public add(ge:Role) {
    return this.http.post<Role>(this.runtimeConfigService.getValue("api") + 'role', ge, { withCredentials: true });
  }
  public update(ge:Role) {
    return this.http.put<Role>(this.runtimeConfigService.getValue("api") + 'role', ge, { withCredentials: true });
  }
  public delete(ids:number[]) {
    return this.http.delete<Role[]>(this.runtimeConfigService.getValue("api") + 'role', { withCredentials: true, body: ids.map(e => ({ id: e })) });
  }
}
