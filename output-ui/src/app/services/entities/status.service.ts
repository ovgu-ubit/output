import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Status } from '../../../../../output-interfaces/Publication';

@Injectable({
  providedIn: 'root'
})
export class StatusService {
  
  constructor(private http: HttpClient) { }

  public getStatuses() {
    return this.http.get<Status[]>(environment.api + 'status', { withCredentials: true });
  }

  public getStatus(id:number) {
    return this.http.get<Status>(environment.api + 'status/one?id='+id, { withCredentials: true });
  }

  public insert(ge:Status) {
    return this.http.post<Status>(environment.api + 'status', ge, { withCredentials: true });
  }
  
  public update(ge:Status) {
    return this.http.put<Status>(environment.api + 'status', ge, { withCredentials: true });
  }
  public delete(insts:Status[]) {
    return this.http.delete<Status[]>(environment.api + 'status', { withCredentials: true, body: insts });
  }
}
