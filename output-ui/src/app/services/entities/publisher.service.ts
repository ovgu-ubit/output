import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { Publisher } from '../../../../../output-interfaces/Publication';
import { PublisherIndex } from '../../../../../output-interfaces/PublicationIndex';
import { EntityService } from 'src/app/interfaces/service';

@Injectable({
  providedIn: 'root'
})
export class PublisherService implements EntityService<Publisher, PublisherIndex> {

  constructor(private http: HttpClient) { }

  public getAll() {
    return this.http.get<Publisher[]>(environment.api + 'publisher', { withCredentials: true });
  }
  public getOne(id: number) {
    return this.http.get<Publisher>(environment.api + 'publisher/one?id=' + id, { withCredentials: true });
  }
  public add(ge: Publisher) {
    return this.http.post<Publisher>(environment.api + 'publisher', ge, { withCredentials: true });
  }
  public update(ge: Publisher) {
    return this.http.put<Publisher>(environment.api + 'publisher', ge, { withCredentials: true });
  }
  public index(reporting_year: number) {
    return this.http.get<PublisherIndex[]>(environment.api + 'publisher/index?reporting_year=' + reporting_year, { withCredentials: true });
  }
  public delete(ids: number[]) {
    return this.http.delete<Publisher[]>(environment.api + 'publisher', { withCredentials: true, body: ids.map(e => ({ id: e })) });
  }
  public combine(id1: number, ids: number[], options?: { aliases: string[] }) {
    return this.http.post(environment.api + 'publisher/combine', { id1, ids, aliases: options.aliases }, { withCredentials: true });
  }
}
