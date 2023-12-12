import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { ContractIndex } from '../../../../../output-interfaces/PublicationIndex';
import { Contract } from '../../../../../output-interfaces/Publication';

@Injectable({
  providedIn: 'root'
})
export class ContractService {

  
  constructor(private http: HttpClient) { }

  public getContracts() {
    return this.http.get<Contract[]>(environment.api + 'contract', { withCredentials: true });
  }

  public index(reporting_year:number) {
    return this.http.get<ContractIndex[]>(environment.api + 'contract/index?reporting_year='+reporting_year, { withCredentials: true });
  }

  public getContract(id:number) {
    return this.http.get<Contract>(environment.api + 'contract/one?id='+id, { withCredentials: true });
  }

  public insert(ge:Contract) {
    return this.http.post<Contract>(environment.api + 'contract', ge, { withCredentials: true });
  }
  public update(ge:Contract) {
    return this.http.put<Contract>(environment.api + 'contract', ge, { withCredentials: true });
  }
  public delete(insts:Contract[]) {
    return this.http.delete<Contract[]>(environment.api + 'contract', { withCredentials: true, body: insts });
  }
  public combine(id1:number, ids:number[]) {
    return this.http.post(environment.api + 'contract/combine', {id1,ids}, { withCredentials: true });
  }
}
