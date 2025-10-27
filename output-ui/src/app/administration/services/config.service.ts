import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Config, GroupedConfig } from '../../../../../output-interfaces/Config';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  constructor(private http: HttpClient) { }

  list() {
    return this.http.get<GroupedConfig[]>(environment.api + 'config');
  }

  get(key:string) {
    return this.http.get<GroupedConfig>(environment.api + 'config?key='+key);
  }

  set(key: string, values: (string | null)[]) {
    return this.http.post<GroupedConfig>(environment.api + 'config', { key, values });
  }
}
