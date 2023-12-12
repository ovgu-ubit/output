import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { OA_Category } from '../../../../../output-interfaces/Publication';
import { OACategoryIndex } from '../../../../../output-interfaces/PublicationIndex';

@Injectable({
  providedIn: 'root'
})
export class OACategoryService {

  constructor(private http: HttpClient) { }

  public getOACategories() {
    return this.http.get<OA_Category[]>(environment.api + 'oa_cat', { withCredentials: true });
  }
  public getOACategory(id:number) {
    return this.http.get<OA_Category>(environment.api + 'oa_cat/one?id='+id, { withCredentials: true });
  }
  public insert(ge:OA_Category) {
    return this.http.post<OA_Category>(environment.api + 'oa_cat', ge, { withCredentials: true });
  }
  public update(ge:OA_Category) {
    return this.http.put<OA_Category>(environment.api + 'oa_cat', ge, { withCredentials: true });
  }
  public index(reporting_year:number) {
    return this.http.get<OACategoryIndex[]>(environment.api + 'oa_cat/index?reporting_year='+reporting_year, { withCredentials: true });
  }
  public delete(insts:OA_Category[]) {
    return this.http.delete<OA_Category[]>(environment.api + 'oa_cat', { withCredentials: true, body: insts });
  }
  public combine(id1:number, ids:number[]) {
    return this.http.post(environment.api + 'oa_cat/combine', {id1,ids}, { withCredentials: true });
  }
}
