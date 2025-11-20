import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Language } from '../../../../../output-interfaces/Publication';
import { EntityService } from 'src/app/services/entities/service.interface';
import { RuntimeConfigService } from '../runtime-config.service';

@Injectable({
  providedIn: 'root'
})
export class LanguageService implements EntityService<Language, Language> {

  
  constructor(private http: HttpClient, private runtimeConfigService:RuntimeConfigService) { }

  public getAll() {
    return this.http.get<Language[]>(this.runtimeConfigService.getValue("api") + 'language', { withCredentials: true });
  }
  public index() {
    return this.getAll();
  }
  public getOne(id:number) {
    return this.http.get<Language>(this.runtimeConfigService.getValue("api") + 'language/one?id='+id, { withCredentials: true });
  }
  public add(ge:Language) {
    return this.http.post<Language>(this.runtimeConfigService.getValue("api") + 'language', ge, { withCredentials: true });
  }
  public update(ge:Language) {
    return this.http.put<Language>(this.runtimeConfigService.getValue("api") + 'language', ge, { withCredentials: true });
  }
  public delete(ids:number[]) {
    return this.http.delete<Language[]>(this.runtimeConfigService.getValue("api") + 'language', { withCredentials: true, body: ids.map(e => ({id:e})) });
  }
}
