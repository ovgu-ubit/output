import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CostType, Invoice, Publication } from '../../../../../output-interfaces/Publication';
import { environment } from 'src/environments/environment';
import { EntityService } from 'src/app/interfaces/service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService implements EntityService<Invoice, Invoice>{

  constructor(private http: HttpClient) { }

  public getAll():Observable<Invoice[]> {
    throw "not yet implemented";
  }
  public index():Observable<Invoice[]> {
    throw "not yet implemented";
  }
  public getInvForPub(pub:Publication) {
    return this.http.get<Invoice[]>(environment.api + 'invoice?pub_id='+pub.id, { withCredentials: true });
  }
  public getOne(id:number) {
    return this.http.get<Invoice>(environment.api + 'invoice/one?id='+id, { withCredentials: true });
  }
  public add(ge:Invoice) {
    return this.http.post<Invoice>(environment.api + 'invoice', ge, { withCredentials: true });
  }
  public update(ge:Invoice) {
    return this.http.put<Invoice>(environment.api + 'invoice', ge, { withCredentials: true });
  }
  public delete(ids:number[]) {
    return this.http.delete<Invoice[]>(environment.api + 'invoice', { withCredentials: true, body: ids.map(e => ({id:e})) });
  }
}
