import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { FunderIndex } from '../../../../../output-interfaces/PublicationIndex';
import { Funder } from '../../../../../output-interfaces/Publication';

@Injectable({
  providedIn: 'root'
})
export class FunderService {

  
  constructor(private http: HttpClient) { }

  public getFunders() {
    return this.http.get<Funder[]>(environment.api + 'funder', { withCredentials: true });
  }

  public getFunder(id:number) {
    return this.http.get<Funder>(environment.api + 'funder/one?id='+id, { withCredentials: true });
  }

  public insert(ge:Funder) {
    return this.http.post<Funder>(environment.api + 'funder', ge, { withCredentials: true });
  }
  
  public update(ge:Funder) {
    return this.http.put<Funder>(environment.api + 'funder', ge, { withCredentials: true });
  }

  public index(reporting_year:number) {
    return this.http.get<FunderIndex[]>(environment.api + 'funder/index?reporting_year='+reporting_year, { withCredentials: true });
  }
  public delete(insts:Funder[]) {
    return this.http.delete<Funder[]>(environment.api + 'funder', { withCredentials: true, body: insts });
  }
  public combine(id1:number, ids:number[], aliases?:string[]) {
    return this.http.post(environment.api + 'funder/combine', {id1,ids, aliases}, { withCredentials: true });
  }
}
