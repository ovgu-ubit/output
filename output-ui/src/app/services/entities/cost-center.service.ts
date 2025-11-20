import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CostCenter, CostType } from '../../../../../output-interfaces/Publication';
import { CostCenterIndex } from '../../../../../output-interfaces/PublicationIndex';
import { EntityService } from 'src/app/services/entities/service.interface';
import { RuntimeConfigService } from '../runtime-config.service';

@Injectable({
  providedIn: 'root'
})
export class CostCenterService implements EntityService<CostCenter, CostCenterIndex> {

  constructor(private http: HttpClient, private runtimeConfigService:RuntimeConfigService) { }

  public getAll() {
    return this.http.get<CostCenter[]>(this.runtimeConfigService.getValue("api") + 'invoice/cost_center', { withCredentials: true });
  }
  public index(reporting_year:number) {
    return this.http.get<CostCenterIndex[]>(this.runtimeConfigService.getValue("api") + 'invoice/cost_center/index?reporting_year='+reporting_year, { withCredentials: true });
  }
  public getOne(id:number) {
    return this.http.get<CostCenter>(this.runtimeConfigService.getValue("api") + 'invoice/cost_center/'+id, { withCredentials: true });
  }
  public add(ct:CostCenter) {
    return this.http.post<CostCenter>(this.runtimeConfigService.getValue("api") + 'invoice/cost_center', ct, { withCredentials: true });
  }
  public update(ct:CostCenter) {
    return this.http.put<CostCenter>(this.runtimeConfigService.getValue("api") + 'invoice/cost_center', ct, { withCredentials: true });
  }
  public delete(ids:number[]) {
    return this.http.delete<CostCenter[]>(this.runtimeConfigService.getValue("api") + 'invoice/cost_center', {body: ids.map(e => ({ id: e })), withCredentials: true });
  }
}
