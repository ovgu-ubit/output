import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { firstValueFrom, interval, concatMap, Observable, map } from 'rxjs';
import { CSVMapping, UpdateMapping, UpdateOptions } from '../../../../output-interfaces/Config'
import { FilterOptions, HighlightOptions } from '../../../../output-interfaces/Statistics';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  constructor(private http:HttpClient) { }

  public getOptionalFields() {
    return this.http.get<{abstract: boolean,citation: boolean,page_count: boolean,pub_date_submitted: boolean,pub_date_print: boolean,peer_reviewed: boolean}>(environment.api + 'config/optional_fields', { withCredentials: true });
  }
  public getInstition() {
    return this.http.get<{ label: string, short_label: string }>(environment.api + 'config/institution', { withCredentials: true });
  }
  public getIndexColumns() {
    return this.http.get<string[]>(environment.api + 'config/pub_index_columns', { withCredentials: true });
  }
  public getImportService() {
    return this.http.get<string>(environment.api + 'config/doi_import', { withCredentials: true });
  }
}
