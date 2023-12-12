import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { GreaterEntity } from '../../../../../output-interfaces/Publication';
import { GreaterEntityIndex } from '../../../../../output-interfaces/PublicationIndex';

@Injectable({
  providedIn: 'root'
})
export class GreaterEntityService {

  constructor(private http: HttpClient) { }

  public getGreaterEntities() {
    return this.http.get<GreaterEntity[]>(environment.api + 'greater_entity', { withCredentials: true });
  }

  public getGreaterEntity(id:number) {
    return this.http.get<GreaterEntity>(environment.api + 'greater_entity/one?id='+id, { withCredentials: true });
  }

  public insert(ge:GreaterEntity) {
    return this.http.post<GreaterEntity>(environment.api + 'greater_entity', ge, { withCredentials: true });
  }
  
  public update(ge:GreaterEntity) {
    return this.http.put<GreaterEntity>(environment.api + 'greater_entity', ge, { withCredentials: true });
  }

  public index(reporting_year:number) {
    return this.http.get<GreaterEntityIndex[]>(environment.api + 'greater_entity/index?reporting_year='+reporting_year, { withCredentials: true });
  }
  public delete(insts:GreaterEntity[]) {
    return this.http.delete<GreaterEntity[]>(environment.api + 'greater_entity', { withCredentials: true, body: insts });
  }
  public combine(id1:number, ids:number[]) {
    return this.http.post(environment.api + 'greater_entity/combine', {id1,ids}, { withCredentials: true });
  }
}
