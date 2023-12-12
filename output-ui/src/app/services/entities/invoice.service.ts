import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CostType, Invoice, Publication } from '../../../../../output-interfaces/Publication';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {

  constructor(private http: HttpClient) { }

  public getInvForPub(pub:Publication) {
    return this.http.get<Invoice[]>(environment.api + 'invoice?pub_id='+pub.id, { withCredentials: true });
  }

  public getInvoice(id:number) {
    return this.http.get<Invoice>(environment.api + 'invoice/one?id='+id, { withCredentials: true });
  }

  public insert(ge:Invoice) {
    return this.http.post<Invoice>(environment.api + 'invoice', ge, { withCredentials: true });
  }
  
  public update(ge:Invoice) {
    return this.http.put<Invoice>(environment.api + 'invoice', ge, { withCredentials: true });
  }
  public delete(insts:Invoice[]) {
    return this.http.delete<Invoice[]>(environment.api + 'invoice', { withCredentials: true, body: insts });
  }
}
