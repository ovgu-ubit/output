import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { PublicationType } from '../../../../../output-interfaces/Publication';
import { PublicationTypeIndex } from '../../../../../output-interfaces/PublicationIndex';
import { EntityService } from 'src/app/interfaces/service';

@Injectable({
  providedIn: 'root'
})
export class PublicationTypeService implements EntityService<PublicationType, PublicationTypeIndex> {

  constructor(private http: HttpClient) { }

  public getAll() {
    return this.http.get<PublicationType[]>(environment.api + 'pub_type', { withCredentials: true });
  }
  public getOne(id: number) {
    return this.http.get<PublicationType>(environment.api + 'pub_type/one?id=' + id, { withCredentials: true });
  }
  public add(ge: PublicationType) {
    return this.http.post<PublicationType>(environment.api + 'pub_type', ge, { withCredentials: true });
  }
  public update(ge: PublicationType) {
    return this.http.put<PublicationType>(environment.api + 'pub_type', ge, { withCredentials: true });
  }
  public index(reporting_year: number) {
    return this.http.get<PublicationTypeIndex[]>(environment.api + 'pub_type/index?reporting_year=' + reporting_year, { withCredentials: true });
  }
  public delete(ids: number[]) {
    return this.http.delete<PublicationType[]>(environment.api + 'pub_type', { withCredentials: true, body: ids.map(e => ({ id: e })) });
  }
  public combine(id1: number, ids: number[], options?: {aliases: string[]}) {
    return this.http.post(environment.api + 'pub_type/combine', { id1, ids, aliases: options.aliases }, { withCredentials: true });
  }
}
