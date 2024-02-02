import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { InstituteIndex } from '../../../../../output-interfaces/PublicationIndex';
import { Institute } from '../../../../../output-interfaces/Publication';
@Injectable({
  providedIn: 'root'
})
export class InstituteService {

  
  constructor(private http: HttpClient) { }

  public getinstitutes() {
    return this.http.get<Institute[]>(environment.api + 'institute', { withCredentials: true });
  }

  public index(yop:number) {
    return this.http.get<InstituteIndex[]>(environment.api + 'institute/index?reporting_year='+yop, { withCredentials: true });
  }

  public getInstitute(id:number) {
    return this.http.get<Institute>(environment.api + 'institute/'+id, { withCredentials: true });
  }

  public addInstitute(inst:Institute) {
    return this.http.post<Institute>(environment.api + 'institute', inst, { withCredentials: true });
  }

  public update(inst:Institute) {
    return this.http.put<Institute>(environment.api + 'institute', inst, { withCredentials: true });
  }
  
  public delete(insts:Institute[]) {
    return this.http.delete<Institute[]>(environment.api + 'institute', { withCredentials: true, body: insts });
  }

  public combine(id1:number, ids:number[], aliases?:string[]) {
    return this.http.post(environment.api + 'institute/combine', {id1,ids,aliases}, { withCredentials: true });
  }

  public getSubInstitutes(id:number) {
    return this.http.get<number[]>(environment.api + 'institute/subs/'+id, { withCredentials: true });
  }
}
