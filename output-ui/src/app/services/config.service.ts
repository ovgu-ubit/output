import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  constructor(private http:HttpClient) { }

  public getImportService() {
    return this.http.get<string>(environment.api + 'config/doi_import', { withCredentials: true });
  }
}
