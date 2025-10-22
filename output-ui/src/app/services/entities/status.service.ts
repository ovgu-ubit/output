import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Status } from '../../../../../output-interfaces/Publication';
import { EntityService } from 'src/app/services/entities/service.interface';

@Injectable({
  providedIn: 'root'
})
export class StatusService implements EntityService<Status, Status> {
  
  constructor(private http: HttpClient) { }

  public getAll() {
    return this.http.get<Status[]>(environment.api + 'status', { withCredentials: true });
  }
  public index(reporting_year:number) {
    return this.getAll();
  }
  public getOne(id:number) {
    return this.http.get<Status>(environment.api + 'status/one?id='+id, { withCredentials: true });
  }
  public add(ge:Status) {
    return this.http.post<Status>(environment.api + 'status', ge, { withCredentials: true });
  }
  public update(ge:Status) {
    return this.http.put<Status>(environment.api + 'status', ge, { withCredentials: true });
  }
  public delete(ids:number[]) {
    return this.http.delete<Status[]>(environment.api + 'status', { withCredentials: true, body: ids.map(e => ({ id: e })) });
  }
}
