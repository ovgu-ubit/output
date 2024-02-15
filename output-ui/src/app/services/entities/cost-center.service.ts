import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CostCenter, CostType } from '../../../../../output-interfaces/Publication';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CostCenterService {

  constructor(private http: HttpClient) { }

  public getCostCenters() {
    return this.http.get<CostCenter[]>(environment.api + 'invoice/cost_center', { withCredentials: true });
  }
  
  public getCostCenter(id:number) {
    return this.http.get<CostCenter>(environment.api + 'invoice/cost_center/'+id, { withCredentials: true });
  }
  
  public insertCostCenter(ct:CostCenter) {
    return this.http.post<CostCenter>(environment.api + 'invoice/cost_center', ct, { withCredentials: true });
  }

  public updateCostCenter(ct:CostCenter) {
    return this.http.put<CostCenter>(environment.api + 'invoice/cost_center', ct, { withCredentials: true });
  }

  public deleteCostCenter(cts:CostCenter[]) {
    return this.http.delete<CostCenter>(environment.api + 'invoice/cost_center', {body: cts, withCredentials: true });
  }
}
