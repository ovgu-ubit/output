import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { EMPTY, Observable, concatMap, firstValueFrom, map, of } from 'rxjs';
import { Store } from '@ngrx/store';
import { PublicationIndex } from '../../../../../output-interfaces/PublicationIndex';
import { Publication } from '../../../../../output-interfaces/Publication';
import { selectReportingYear } from '../redux';
import { SearchFilter } from '../../../../../output-interfaces/Config';
import { EntityService } from 'src/app/interfaces/service';

@Injectable({
  providedIn: 'root'
})
export class PublicationService implements EntityService<Publication, PublicationIndex> {

  constructor(private http: HttpClient, private store: Store) { }

  public index(yop: number, options?: {soft?:boolean, filter?: SearchFilter, paths?: string[]}) {
    if (options?.soft) return this.http.get<PublicationIndex[]>(environment.api + 'publications/publicationIndex?soft=true', { withCredentials: true });
    if (options?.filter?.expressions?.length > 0 || options?.paths?.length > 0) return this.http.post<PublicationIndex[]>(environment.api + 'publications/filter', { filter: options.filter, paths: options.paths }, { withCredentials: true });
    return this.http.get<PublicationIndex[]>(environment.api + 'publications/publicationIndex?yop=' + yop, { withCredentials: true });
  }
  public getAll() {
    return this.http.get<Publication[]>(environment.api + 'publications', { withCredentials: true });
  }
  public getOne(id: number) {
    return this.http.get<Publication>(environment.api + 'publications/one?id=' + id, { withCredentials: true });
  }
  public update(pub: Publication) {
    return this.http.put<Publication>(environment.api + 'publications', {...pub, edit_date:undefined}, { withCredentials: true });
  }
  public updateAll(pubs: Publication[]) {
    return this.http.put<Publication[]>(environment.api + 'publications', pubs.map(pub => ({...pub, edit_date:undefined})), { withCredentials: true });
  }
  public add(pub: Publication) {
    return this.http.post<Publication>(environment.api + 'publications', pub, { withCredentials: true });
  }
  public delete(ids: number[], soft?:boolean) {
    return this.http.delete<Publication[]>(environment.api + 'publications', { withCredentials: true, body: { publications: ids.map(e => ({ id: e })), soft } });
  }
  public getDefaultReportingYear() {
    return this.http.get<number>(environment.api + 'publications/reporting_year?default=true', { withCredentials: true });
  }
  public setDefaultReportingYear(value: number) {
    return this.http.post<number>(environment.api + 'publications/reporting_year', { year: value }, { withCredentials: true });
  }
  public getReportingYears() {
    return this.http.get<number[]>(environment.api + 'publications/reporting_year', { withCredentials: true });
  }
  public combine(id1: number, ids: number[]) {
    return this.http.post(environment.api + 'publications/combine', { id1, ids }, { withCredentials: true });
  }
  public getFilters() {
    return this.http.get<{ path: string, label: string }[]>(environment.api + 'publications/filter', { withCredentials: true });
  }
}
