import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CostType } from '../../../../../output-interfaces/Publication';
import { environment } from 'src/environments/environment';
import { EntityService } from 'src/app/services/entities/service.interface';
import { CostTypeIndex } from '../../../../../output-interfaces/PublicationIndex';

@Injectable({
  providedIn: 'root'
})
export class CostTypeService implements EntityService<CostType, CostType> {

  constructor(private http: HttpClient) { }

  public getAll() {
    return this.http.get<CostType[]>(environment.api + 'invoice/cost_type', { withCredentials: true });
  }
  public index(reporting_year:number) {
    return this.http.get<CostTypeIndex[]>(environment.api + 'invoice/cost_type_index?reporting_year='+reporting_year, { withCredentials: true });
  }
  public getOne(id:number) {
    return this.http.get<CostType>(environment.api + 'invoice/cost_type/'+id, { withCredentials: true });
  }
  public add(ct:CostType) {
    return this.http.post<CostType>(environment.api + 'invoice/cost_type', ct, { withCredentials: true });
  }
  public update(ct:CostType) {
    return this.http.put<CostType>(environment.api + 'invoice/cost_type', ct, { withCredentials: true });
  }
  public delete(ids:number[]) {
    return this.http.delete<CostType[]>(environment.api + 'invoice/cost_type', {body: ids.map(e => ({ id: e })), withCredentials: true });
  }
}
