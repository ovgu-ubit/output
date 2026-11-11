import { IndexPage, ReportingYearIndexPageRequest } from '@output/interfaces';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {  PublicationType  } from '@output/interfaces';
import {  PublicationTypeIndex  } from '@output/interfaces';
import { IndexEntityService } from 'src/app/services/entities/service.interface';
import { RuntimeConfigService } from '../runtime-config.service';

@Injectable({
  providedIn: 'root'
})
export class PublicationTypeService implements IndexEntityService<PublicationType, PublicationTypeIndex> {

  constructor(private http: HttpClient, private runtimeConfigService:RuntimeConfigService) { }

  public getAll() {
    return this.http.get<PublicationType[]>(this.runtimeConfigService.getValue("api") + 'pub_type', { withCredentials: true });
  }
  public indexPage(request: ReportingYearIndexPageRequest) {
    return this.http.post<IndexPage<PublicationTypeIndex>>(
      this.runtimeConfigService.getValue('api') + 'pub_type/index-page', request, { withCredentials: true },
    );
  }

  public getOne(id: number) {
    return this.http.get<PublicationType>(this.runtimeConfigService.getValue("api") + 'pub_type/one?id=' + id, { withCredentials: true });
  }
  public add(ge: PublicationType) {
    return this.http.post<PublicationType>(this.runtimeConfigService.getValue("api") + 'pub_type', ge, { withCredentials: true });
  }
  public update(ge: PublicationType) {
    return this.http.put<PublicationType>(this.runtimeConfigService.getValue("api") + 'pub_type', ge, { withCredentials: true });
  }
  public delete(ids: number[]) {
    return this.http.delete<PublicationType[]>(this.runtimeConfigService.getValue("api") + 'pub_type', { withCredentials: true, body: ids.map(e => ({ id: e })) });
  }
  public combine(id1: number, ids: number[], options?: {aliases: string[]}) {
    return this.http.post(this.runtimeConfigService.getValue("api") + 'pub_type/combine', { id1, ids, aliases: options.aliases }, { withCredentials: true });
  }
}
