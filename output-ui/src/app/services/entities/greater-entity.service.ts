import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { GreaterEntity } from '../../../../../output-interfaces/Publication';
import { GreaterEntityIndex } from '../../../../../output-interfaces/PublicationIndex';
import { EntityService } from 'src/app/services/entities/service.interface';

@Injectable({
  providedIn: 'root'
})
export class GreaterEntityService implements EntityService<GreaterEntity,GreaterEntityIndex>{

  constructor(private http: HttpClient) { }

  public getAll() {
    return this.http.get<GreaterEntity[]>(environment.api + 'greater_entity', { withCredentials: true });
  }
  public getOne(id:number) {
    return this.http.get<GreaterEntity>(environment.api + 'greater_entity/one?id='+id, { withCredentials: true });
  }
  public add(ge:GreaterEntity) {
    return this.http.post<GreaterEntity>(environment.api + 'greater_entity', ge, { withCredentials: true });
  }
  public update(ge:GreaterEntity) {
    return this.http.put<GreaterEntity>(environment.api + 'greater_entity', ge, { withCredentials: true });
  }
  public index(reporting_year:number) {
    return this.http.get<GreaterEntityIndex[]>(environment.api + 'greater_entity/index?reporting_year='+reporting_year, { withCredentials: true });
  }
  public delete(ids:number[]) {
    return this.http.delete<GreaterEntity[]>(environment.api + 'greater_entity', { withCredentials: true, body: ids.map(e => ({ id: e })) });
  }
  public combine(id1:number, ids:number[]) {
    return this.http.post(environment.api + 'greater_entity/combine', {id1,ids}, { withCredentials: true });
  }
}
