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
    return this.http.put<Publication[]>(environment.api + 'publications', pubs, { withCredentials: true });
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
//TODO delete all
  public async filterAuthor(id: number) {
    let pubs = [];
    let res = [];
    let ob$: Observable<any> = this.store.select(selectReportingYear).pipe(concatMap(data => {
      if (data) {
        return of(data);
      } else {
        return this.getDefaultReportingYear();
      }
    }));
    ob$ = ob$.pipe(concatMap(data => this.getPublications(data).pipe(map(d => pubs = d))));
    await firstValueFrom(ob$);
    for (let pub of pubs) {
      let tmp = pub.authorPublications.find(ap => ap.authorId === id);
      if (tmp) res.push(tmp.publicationId)
    }
    return res;
  }

  public async filterAuthorCorr(id: number) {
    let pubs = [];
    let res = [];
    let ob$: Observable<any> = this.store.select(selectReportingYear).pipe(concatMap(data => {
      if (data) {
        return of(data);
      } else {
        return this.getDefaultReportingYear();
      }
    }));
    ob$ = ob$.pipe(concatMap(data => this.getPublications(data).pipe(map(d => pubs = d))));
    await firstValueFrom(ob$);
    for (let pub of pubs) {
      let tmp = pub.authorPublications.find(ap => ap.corresponding && ap.authorId === id);
      if (tmp) res.push(tmp.publicationId)
    }
    return res;
  }
  public async filterInst(ids: number[]) {
    let pubs = [];
    let res = [];
    let ob$: Observable<any> = this.store.select(selectReportingYear).pipe(concatMap(data => {
      if (data) {
        return of(data);
      } else {
        return this.getDefaultReportingYear();
      }
    }));
    ob$ = ob$.pipe(concatMap(data => this.getPublications(data).pipe(map(d => pubs = d))));
    await firstValueFrom(ob$);
    for (let pub of pubs) {
      let tmp = pub.authorPublications.find(ap => ids.includes(ap.institute?.id));
      if (tmp) res.push(tmp.publicationId)
    }
    return res;
  }

  public async filterInstCorr(ids: number[]) {
    let pubs = [];
    let res = [];
    let ob$: Observable<any> = this.store.select(selectReportingYear).pipe(concatMap(data => {
      if (data) {
        return of(data);
      } else {
        return this.getDefaultReportingYear();
      }
    }));
    ob$ = ob$.pipe(concatMap(data => this.getPublications(data).pipe(map(d => pubs = d))));
    await firstValueFrom(ob$);
    for (let pub of pubs) {
      let tmp = pub.authorPublications.find(ap => ap.corresponding && ids.includes(ap.institute?.id));
      if (tmp) res.push(tmp.publicationId)
    }
    return res;
  }

  public async filterContract(id: number) {
    let pubs = [];
    let res = [];
    let ob$: Observable<any> = this.store.select(selectReportingYear).pipe(concatMap(data => {
      if (data) {
        return of(data);
      } else {
        return this.getDefaultReportingYear();
      }
    }));
    ob$ = ob$.pipe(concatMap(data => this.getPublications(data).pipe(map(d => pubs = d))));
    await firstValueFrom(ob$);
    res = pubs.filter(e => e.contract?.id === id).map(e => e.id);
    return res;
  }
  public async filterPublisher(id: number) {
    let pubs = [];
    let res = [];
    let ob$: Observable<any> = this.store.select(selectReportingYear).pipe(concatMap(data => {
      if (data) {
        return of(data);
      } else {
        return this.getDefaultReportingYear();
      }
    }));
    ob$ = ob$.pipe(concatMap(data => this.getPublications(data).pipe(map(d => pubs = d))));
    await firstValueFrom(ob$);
    res = pubs.filter(e => e.publisher?.id === id).map(e => e.id);
    return res;
  }
  public async filterGE(id: number) {
    let pubs = [];
    let res = [];
    let ob$: Observable<any> = this.store.select(selectReportingYear).pipe(concatMap(data => {
      if (data) {
        return of(data);
      } else {
        return this.getDefaultReportingYear();
      }
    }));
    ob$ = ob$.pipe(concatMap(data => this.getPublications(data).pipe(map(d => pubs = d))));
    await firstValueFrom(ob$);
    res = pubs.filter(e => e.greater_entity?.id === id).map(e => e.id);
    return res;
  }
  public async filterFunder(id: number) {
    let pubs = [];
    let res = [];
    let ob$: Observable<any> = this.store.select(selectReportingYear).pipe(concatMap(data => {
      if (data) {
        return of(data);
      } else {
        return this.getDefaultReportingYear();
      }
    }));
    ob$ = ob$.pipe(concatMap(data => this.getPublications(data).pipe(map(d => pubs = d))));
    await firstValueFrom(ob$);
    res = pubs.filter(e => e.funders?.find(e => e.id === id)).map(e => e.id);
    return res;
  }
  public async filterPubType(id: number) {
    let pubs = [];
    let res = [];
    let ob$: Observable<any> = this.store.select(selectReportingYear).pipe(concatMap(data => {
      if (data) {
        return of(data);
      } else {
        return this.getDefaultReportingYear();
      }
    }));
    ob$ = ob$.pipe(concatMap(data => this.getPublications(data).pipe(map(d => pubs = d))));
    await firstValueFrom(ob$);
    res = pubs.filter(e => e.pub_type?.id === id).map(e => e.id);
    return res;
  }
  public async filterOACat(id: number) {
    let pubs = [];
    let res = [];
    let ob$: Observable<any> = this.store.select(selectReportingYear).pipe(concatMap(data => {
      if (data) {
        return of(data);
      } else {
        return this.getDefaultReportingYear();
      }
    }));
    ob$ = ob$.pipe(concatMap(data => this.getPublications(data).pipe(map(d => pubs = d))));
    await firstValueFrom(ob$);
    res = pubs.filter(e => e.oa_category?.id === id).map(e => e.id);
    return res;
  }
}
