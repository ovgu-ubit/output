import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Language } from '../../../../../output-interfaces/Publication';
import { EntityService } from 'src/app/interfaces/service';

@Injectable({
  providedIn: 'root'
})
export class LanguageService implements EntityService<Language, Language> {

  
  constructor(private http: HttpClient) { }

  public getAll() {
    return this.http.get<Language[]>(environment.api + 'language', { withCredentials: true });
  }
  public index() {
    return this.getAll();
  }
  public getOne(id:number) {
    return this.http.get<Language>(environment.api + 'language/one?id='+id, { withCredentials: true });
  }
  public add(ge:Language) {
    return this.http.post<Language>(environment.api + 'language', ge, { withCredentials: true });
  }
  public update(ge:Language) {
    return this.http.put<Language>(environment.api + 'language', ge, { withCredentials: true });
  }
  public delete(ids:number[]) {
    return this.http.delete<Language[]>(environment.api + 'language', { withCredentials: true, body: ids.map(e => ({id:e})) });
  }
}
