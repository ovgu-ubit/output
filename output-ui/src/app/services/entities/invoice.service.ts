import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CostType, Invoice, Publication } from '../../../../../output-interfaces/Publication';
import { EntityService } from 'src/app/services/entities/service.interface';
import { Observable } from 'rxjs';
import { RuntimeConfigService } from '../runtime-config.service';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService implements EntityService<Invoice, Invoice>{

  constructor(private http: HttpClient, private runtimeConfigService:RuntimeConfigService) { }

  public getAll():Observable<Invoice[]> {
    throw "not yet implemented";
  }
  public index():Observable<Invoice[]> {
    throw "not yet implemented";
  }
  public getInvForPub(pub:Publication) {
    return this.http.get<Invoice[]>(this.runtimeConfigService.getValue("api") + 'invoice?pub_id='+pub.id, { withCredentials: true });
  }
  public getOne(id:number) {
    return this.http.get<Invoice>(this.runtimeConfigService.getValue("api") + 'invoice/one?id='+id, { withCredentials: true });
  }
  public add(ge:Invoice) {
    return this.http.post<Invoice>(this.runtimeConfigService.getValue("api") + 'invoice', ge, { withCredentials: true });
  }
  public update(ge:Invoice) {
    return this.http.put<Invoice>(this.runtimeConfigService.getValue("api") + 'invoice', ge, { withCredentials: true });
  }
  public delete(ids:number[]) {
    return this.http.delete<Invoice[]>(this.runtimeConfigService.getValue("api") + 'invoice', { withCredentials: true, body: ids.map(e => ({id:e})) });
  }
}
