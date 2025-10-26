import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Config } from '../../../../../output-interfaces/Config';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  constructor(private http: HttpClient) { }

  list() {
    return this.http.get<Config[]>(environment.api + 'config');
  }

  set(key: string, value: string | null) {
    return this.http.post<Config>(environment.api + 'config', { key, value });
  }
}
