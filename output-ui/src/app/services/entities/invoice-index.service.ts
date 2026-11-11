import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { InvoiceIndexPage, InvoiceIndexQuery } from '@output/interfaces';
import { Observable } from 'rxjs';
import { RuntimeConfigService } from '../runtime-config.service';

@Injectable({ providedIn: 'root' })
export class InvoiceIndexService {
  constructor(private http: HttpClient, private runtimeConfig: RuntimeConfigService) { }

  index(query: InvoiceIndexQuery): Observable<InvoiceIndexPage> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<InvoiceIndexPage>(this.runtimeConfig.getValue('api') + 'invoice/index', {
      params, withCredentials: true,
    });
  }
}
