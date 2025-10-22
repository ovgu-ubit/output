import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { InstituteIndex } from '../../../../../output-interfaces/PublicationIndex';
import { Institute } from '../../../../../output-interfaces/Publication';
import { EntityService } from 'src/app/services/entities/service.interface';
@Injectable({
  providedIn: 'root'
})
export class InstituteService implements EntityService<Institute,InstituteIndex> {

  
  constructor(private http: HttpClient) { }

  public getAll() {
    return this.http.get<Institute[]>(environment.api + 'institute', { withCredentials: true });
  }

  public index(yop:number) {
    return this.http.get<InstituteIndex[]>(environment.api + 'institute/index?reporting_year='+yop, { withCredentials: true });
  }

  public getOne(id:number) {
    return this.http.get<Institute>(environment.api + 'institute/'+id, { withCredentials: true });
  }

  public add(inst:Institute) {
    return this.http.post<Institute>(environment.api + 'institute', inst, { withCredentials: true });
  }

  public update(inst:Institute) {
    return this.http.put<Institute>(environment.api + 'institute', inst, { withCredentials: true });
  }
  
  public delete(ids:number[]) {
    return this.http.delete<Institute[]>(environment.api + 'institute', { withCredentials: true, body: ids.map(e => ({id:e})) });
  }

  public combine(id1:number, ids:number[], options?: {aliases: string[]}) {
    return this.http.post(environment.api + 'institute/combine', {id1,ids,aliases: options.aliases}, { withCredentials: true });
  }

  public getSubInstitutes(id:number) {
    return this.http.get<number[]>(environment.api + 'institute/subs/'+id, { withCredentials: true });
  }
}
