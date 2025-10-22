import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { FunderIndex } from '../../../../../output-interfaces/PublicationIndex';
import { Funder } from '../../../../../output-interfaces/Publication';
import { EntityService } from 'src/app/services/entities/service.interface';

@Injectable({
  providedIn: 'root'
})
export class FunderService implements EntityService<Funder, FunderIndex> {

  constructor(private http: HttpClient) { }

  public getAll() {
    return this.http.get<Funder[]>(environment.api + 'funder', { withCredentials: true });
  }
  public getOne(id: number) {
    return this.http.get<Funder>(environment.api + 'funder/one?id=' + id, { withCredentials: true });
  }
  public add(ge: Funder) {
    return this.http.post<Funder>(environment.api + 'funder', ge, { withCredentials: true });
  }
  public update(ge: Funder) {
    return this.http.put<Funder>(environment.api + 'funder', ge, { withCredentials: true });
  }
  public index(reporting_year: number) {
    return this.http.get<FunderIndex[]>(environment.api + 'funder/index?reporting_year=' + reporting_year, { withCredentials: true });
  }
  public delete(ids: number[]) {
    return this.http.delete<Funder[]>(environment.api + 'funder', { withCredentials: true, body: ids.map(e => ({ id: e })) });
  }
  public combine(id1: number, ids: number[], options?: {aliases: string[]}) {
    return this.http.post(environment.api + 'funder/combine', { id1, ids, aliases: options.aliases }, { withCredentials: true });
  }
}
