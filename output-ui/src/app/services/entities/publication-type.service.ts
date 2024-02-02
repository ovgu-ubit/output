import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { PublicationType } from '../../../../../output-interfaces/Publication';
import { PublicationTypeIndex } from '../../../../../output-interfaces/PublicationIndex';

@Injectable({
  providedIn: 'root'
})
export class PublicationTypeService {

  constructor(private http: HttpClient) { }

  public getPubTypes() {
    return this.http.get<PublicationType[]>(environment.api + 'pub_type', { withCredentials: true });
  }
  public getPubType(id:number) {
    return this.http.get<PublicationType>(environment.api + 'pub_type/one?id='+id, { withCredentials: true });
  }
  public insert(ge:PublicationType) {
    return this.http.post<PublicationType>(environment.api + 'pub_type', ge, { withCredentials: true });
  }
  public update(ge:PublicationType) {
    return this.http.put<PublicationType>(environment.api + 'pub_type', ge, { withCredentials: true });
  }
  public index(reporting_year:number) {
    return this.http.get<PublicationTypeIndex[]>(environment.api + 'pub_type/index?reporting_year='+reporting_year, { withCredentials: true });
  }
  public delete(insts:PublicationType[]) {
    return this.http.delete<PublicationType[]>(environment.api + 'pub_type', { withCredentials: true, body: insts });
  }
  public combine(id1:number, ids:number[], aliases?:string[]) {
    return this.http.post(environment.api + 'pub_type/combine', {id1,ids, aliases}, { withCredentials: true });
  }
}
