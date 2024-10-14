import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Role } from '../../../../../output-interfaces/Publication';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  
  constructor(private http: HttpClient) { }

  public getRoles() {
    return this.http.get<Role[]>(environment.api + 'role', { withCredentials: true });
  }

  public getRole(id:number) {
    return this.http.get<Role>(environment.api + 'role/one?id='+id, { withCredentials: true });
  }

  public insert(ge:Role) {
    return this.http.post<Role>(environment.api + 'role', ge, { withCredentials: true });
  }
  
  public update(ge:Role) {
    return this.http.put<Role>(environment.api + 'role', ge, { withCredentials: true });
  }
  public delete(insts:Role[]) {
    return this.http.delete<Role[]>(environment.api + 'role', { withCredentials: true, body: insts });
  }
}
