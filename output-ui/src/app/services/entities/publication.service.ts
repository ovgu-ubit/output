import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EntityService } from 'src/app/services/entities/service.interface';
import { SearchFilter } from '../../../../../output-interfaces/Config';
import { Publication } from '../../../../../output-interfaces/Publication';
import { PublicationIndex } from '../../../../../output-interfaces/PublicationIndex';
import { RuntimeConfigService } from '../runtime-config.service';

@Injectable({
  providedIn: 'root'
})
export class PublicationService implements EntityService<Publication, PublicationIndex> {

  constructor(private http: HttpClient, private runtimeConfigService:RuntimeConfigService) { }

  public index(yop: number, options?: {soft?:boolean, filter?: SearchFilter, paths?: string[]}) {
    if (options?.soft) return this.http.get<PublicationIndex[]>(this.runtimeConfigService.getValue("api") + 'publications/publicationIndex?soft=true', { withCredentials: true });
    if (options?.filter?.expressions?.length > 0 || options?.paths?.length > 0) return this.http.post<PublicationIndex[]>(this.runtimeConfigService.getValue("api") + 'publications/filter', { filter: options.filter, paths: options.paths }, { withCredentials: true });
    return this.http.get<PublicationIndex[]>(this.runtimeConfigService.getValue("api") + 'publications/publicationIndex?yop=' + yop, { withCredentials: true });
  }
  public getAll() {
    return this.http.get<Publication[]>(this.runtimeConfigService.getValue("api") + 'publications', { withCredentials: true });
  }
  public getOne(id: number) {
    return this.http.get<Publication>(this.runtimeConfigService.getValue("api") + 'publications/one?id=' + id, { withCredentials: true });
  }
  public update(pub: Publication) {
    return this.http.put<Publication>(this.runtimeConfigService.getValue("api") + 'publications', {...pub, edit_date:undefined}, { withCredentials: true });
  }
  public updateAll(pubs: Publication[]) {
    return this.http.put<Publication[]>(this.runtimeConfigService.getValue("api") + 'publications', pubs.map(pub => ({...pub, edit_date:undefined})), { withCredentials: true });
  }
  public add(pub: Publication) {
    return this.http.post<Publication>(this.runtimeConfigService.getValue("api") + 'publications', pub, { withCredentials: true });
  }
  public delete(ids: number[], soft?:boolean) {
    return this.http.delete<Publication[]>(this.runtimeConfigService.getValue("api") + 'publications', { withCredentials: true, body: { publications: ids.map(e => ({ id: e })), soft } });
  }
  public getReportingYears() {
    return this.http.get<number[]>(this.runtimeConfigService.getValue("api") + 'publications/reporting_year', { withCredentials: true });
  }
  public combine(id1: number, ids: number[]) {
    return this.http.post(this.runtimeConfigService.getValue("api") + 'publications/combine', { id1, ids }, { withCredentials: true });
  }
  public getFilters() {
    return this.http.get<{ path: string, label: string }[]>(this.runtimeConfigService.getValue("api") + 'publications/filter', { withCredentials: true });
  }
}
