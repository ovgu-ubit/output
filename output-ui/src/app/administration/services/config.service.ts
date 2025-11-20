import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Config } from '../../../../../output-interfaces/Config';
import { RuntimeConfigService } from 'src/app/services/runtime-config.service';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  constructor(private http: HttpClient, private runtimeConfigService:RuntimeConfigService) { }

  list() {
    return this.http.get<Config[]>(this.runtimeConfigService.getValue("api") + 'config', { withCredentials: true });
  }

  get(key: string) {
    return this.http.get<Config>(this.runtimeConfigService.getValue("api") + 'config?key=' + key, { withCredentials: true });
  }

  set(key: string, value: any) {
    return this.http.post<Config>(this.runtimeConfigService.getValue("api") + 'config', { key, value }, { withCredentials: true });
  }
}
