import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CostCenter, CostType } from '../../../../../output-interfaces/Publication';
import { environment } from 'src/environments/environment';
import { CostCenterIndex } from '../../../../../output-interfaces/PublicationIndex';
import { EntityService } from 'src/app/interfaces/service';

@Injectable({
  providedIn: 'root'
})
export class CostCenterService implements EntityService<CostCenter, CostCenterIndex> {

  constructor(private http: HttpClient) { }

  public getAll() {
    return this.http.get<CostCenter[]>(environment.api + 'invoice/cost_center', { withCredentials: true });
  }
  public index(reporting_year:number) {
    return this.http.get<CostCenterIndex[]>(environment.api + 'invoice/cost_center/index?reporting_year='+reporting_year, { withCredentials: true });
  }
  public getOne(id:number) {
    return this.http.get<CostCenter>(environment.api + 'invoice/cost_center/'+id, { withCredentials: true });
  }
  public add(ct:CostCenter) {
    return this.http.post<CostCenter>(environment.api + 'invoice/cost_center', ct, { withCredentials: true });
  }
  public update(ct:CostCenter) {
    return this.http.put<CostCenter>(environment.api + 'invoice/cost_center', ct, { withCredentials: true });
  }
  public delete(ids:number[]) {
    return this.http.delete<CostCenter[]>(environment.api + 'invoice/cost_center', {body: ids.map(e => ({ id: e })), withCredentials: true });
  }
  public combine(id1: number, ids: number[]) {
    throw "not yet implemented";
  }
}
