import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { PublicationDuplicate, Status } from '../../../../../output-interfaces/Publication';
import { EntityService } from 'src/app/services/entities/service.interface';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PublicationDuplicateService implements EntityService<PublicationDuplicate, PublicationDuplicate> {
  
  constructor(private http: HttpClient) { }

  index(reporting_year: number, options?: any): Observable<PublicationDuplicate[]> {
    return this.getAll(options?.soft);
  }
  update(obj: PublicationDuplicate): Observable<PublicationDuplicate> {
    return this.http.put<PublicationDuplicate>(environment.api + 'publications/duplicates', obj, { withCredentials: true });
  }
  combine?(id1: number, ids: number[], options?: any) {
    throw new Error('Method not implemented.');
  }

  public getAll(soft?) {
    return this.http.get<PublicationDuplicate[]>(environment.api + 'publications/duplicates?soft='+soft, { withCredentials: true });
  }
  public getOne(id:number) {
    return this.http.get<PublicationDuplicate>(environment.api + 'publications/duplicates?id='+id, { withCredentials: true });
  }
  public add(ge:PublicationDuplicate) {
    return this.http.post<PublicationDuplicate>(environment.api + 'publications/duplicates', ge, { withCredentials: true });
  }
  public delete(ids:number[], soft?:boolean) {
    return this.http.delete<PublicationDuplicate[]>(environment.api + 'publications/duplicates', { withCredentials: true, body: {duplicate: { id: ids[0]}, soft} });
  }
}
