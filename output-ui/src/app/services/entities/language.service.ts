import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Language } from '../../../../../output-interfaces/Publication';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {

  
  constructor(private http: HttpClient) { }

  public getLanguages() {
    return this.http.get<Language[]>(environment.api + 'language', { withCredentials: true });
  }

  public getLanguage(id:number) {
    return this.http.get<Language>(environment.api + 'language/one?id='+id, { withCredentials: true });
  }

  public insert(ge:Language) {
    return this.http.post<Language>(environment.api + 'language', ge, { withCredentials: true });
  }
  
  public update(ge:Language) {
    return this.http.put<Language>(environment.api + 'language', ge, { withCredentials: true });
  }
  public delete(insts:Language[]) {
    return this.http.delete<Language[]>(environment.api + 'language', { withCredentials: true, body: insts });
  }
}
