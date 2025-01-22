import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { EMPTY, Observable, concatMap, firstValueFrom, map, of } from 'rxjs';
import { Store } from '@ngrx/store';
import { PublicationIndex } from '../../../../../output-interfaces/PublicationIndex';
import { Publication } from '../../../../../output-interfaces/Publication';
import { selectReportingYear } from '../redux';
import { SearchFilter } from '../../../../../output-interfaces/Config';

@Injectable({
  providedIn: 'root'
})
export class PublicationService {

  constructor(private http: HttpClient, private store: Store) { }

  public index(yop: number) {
    return this.http.get<PublicationIndex[]>(environment.api + 'publications/publicationIndex?yop=' + yop, { withCredentials: true });
  }

  public softIndex() {
    return this.http.get<PublicationIndex[]>(environment.api + 'publications/publicationIndex?soft=true', { withCredentials: true });
  }

  public getPublications(yop: number) {
    return this.http.get<Publication[]>(environment.api + 'publications?yop=' + yop, { withCredentials: true });
  }

  public getPublication(id: number) {
    return this.http.get<Publication>(environment.api + 'publications/one?id=' + id, { withCredentials: true });
  }

  public save(pubs: Publication[]) {
    return this.http.put<Publication[]>(environment.api + 'publications', pubs.map(pub => ({...pub, edit_date:undefined})), { withCredentials: true });
  }

  public insert(pub: Publication) {
    return this.http.post<Publication>(environment.api + 'publications', pub, { withCredentials: true });
  }

  public delete(pubs: Publication[], soft?) {
    return this.http.delete<Publication[]>(environment.api + 'publications', { withCredentials: true, body: { publications: pubs, soft } });
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

  public filter(filter: SearchFilter, paths?: string[]): Observable<PublicationIndex[]> {
    return this.http.post<PublicationIndex[]>(environment.api + 'publications/filter', { filter, paths }, { withCredentials: true });
  }

  public getFilters() {
    return this.http.get<{ path: string, label: string }[]>(environment.api + 'publications/filter', { withCredentials: true });
  }

}
