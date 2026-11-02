import { IndexPage, ReportingYearIndexPageRequest } from '@output/interfaces';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {  ContractIndex  } from '@output/interfaces';
import {  Contract  } from '@output/interfaces';
import { IndexEntityService } from 'src/app/services/entities/service.interface';
import { RuntimeConfigService } from '../runtime-config.service';

@Injectable({
  providedIn: 'root'
})
export class ContractService implements IndexEntityService<Contract, ContractIndex> {

  constructor(private http: HttpClient, private runtimeConfigService:RuntimeConfigService) { }

  public getAll() {
    return this.http.get<Contract[]>(this.runtimeConfigService.getValue("api") + 'contract', { withCredentials: true });
  }


  public indexPage(request: ReportingYearIndexPageRequest) {
    return this.http.post<IndexPage<ContractIndex>>(
      this.runtimeConfigService.getValue('api') + 'contract/index-page', request, { withCredentials: true },
    );
  }

  public getOne(id: number) {
    return this.http.get<Contract>(this.runtimeConfigService.getValue("api") + 'contract/one?id=' + id, { withCredentials: true });
  }

  public add(ge: Contract) {
    return this.http.post<Contract>(this.runtimeConfigService.getValue("api") + 'contract', ge, { withCredentials: true });
  }
  public update(ge: Contract) {
    return this.http.put<Contract>(this.runtimeConfigService.getValue("api") + 'contract', ge, { withCredentials: true });
  }
  public delete(ids: number[]) {
    return this.http.delete<Contract[]>(this.runtimeConfigService.getValue("api") + 'contract', { withCredentials: true, body: ids.map(e => ({ id: e })) });
  }
  public combine(id1: number, ids: number[]) {
    return this.http.post(this.runtimeConfigService.getValue("api") + 'contract/combine', { id1, ids }, { withCredentials: true });
  }
}
