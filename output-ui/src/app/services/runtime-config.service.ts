import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
  private config?: any;

  constructor(private http: HttpClient) {}

  load(): Promise<void> {
    return this.http
      .get(environment.runtimeConfig)
      .toPromise()
      .then(cfg => {
        this.config = cfg;
      });
  }

  getValue(key:string): string {
    if (!this.config) {
      throw new Error('RuntimeConfig not loaded yet');
    }
    return this.config[key];
  }
}