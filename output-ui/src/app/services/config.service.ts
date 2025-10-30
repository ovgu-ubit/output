import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  constructor(private http:HttpClient) { }

  public getIndexColumns() {
    return this.http.get<string[]>(environment.api + 'config/pub_index_columns', { withCredentials: true });
  }
  public getImportService() {
    return this.http.get<string>(environment.api + 'config/doi_import', { withCredentials: true });
  }
}
