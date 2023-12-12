import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CostType } from '../../../../../output-interfaces/Publication';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CostTypeService {

  constructor(private http: HttpClient) { }

  public getCostTypes() {
    return this.http.get<CostType[]>(environment.api + 'invoice/cost_type', { withCredentials: true });
  }
  
  public getCostType(id:number) {
    return this.http.get<CostType>(environment.api + 'invoice/cost_type?id='+id, { withCredentials: true });
  }
  
  public insertCostType(ct:CostType) {
    return this.http.post<CostType>(environment.api + 'invoice/cost_type', ct, { withCredentials: true });
  }

  public updateCostType(ct:CostType) {
    return this.http.put<CostType>(environment.api + 'invoice/cost_type', ct, { withCredentials: true });
  }

  public deleteCostType(ct:CostType[]) {
    return this.http.delete<CostType>(environment.api + 'invoice/cost_type', {body: ct, withCredentials: true });
  }
}
