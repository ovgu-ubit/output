import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { Publisher } from '../../../../../output-interfaces/Publication';
import { PublisherIndex } from '../../../../../output-interfaces/PublicationIndex';

@Injectable({
  providedIn: 'root'
})
export class PublisherService {

  
  constructor(private http: HttpClient) { }

  public getPublishers() {
    return this.http.get<Publisher[]>(environment.api + 'publisher', { withCredentials: true });
  }

  public getPublisher(id:number) {
    return this.http.get<Publisher>(environment.api + 'publisher/one?id='+id, { withCredentials: true });
  }

  public insert(ge:Publisher) {
    return this.http.post<Publisher>(environment.api + 'publisher', ge, { withCredentials: true });
  }
  public update(ge:Publisher) {
    return this.http.put<Publisher>(environment.api + 'publisher', ge, { withCredentials: true });
  }
  public index(reporting_year:number) {
    return this.http.get<PublisherIndex[]>(environment.api + 'publisher/index?reporting_year='+reporting_year, { withCredentials: true });
  }
  public delete(insts:Publisher[]) {
    return this.http.delete<Publisher[]>(environment.api + 'publisher', { withCredentials: true, body: insts });
  }
  public combine(id1:number, ids:number[]) {
    return this.http.post(environment.api + 'publisher/combine', {id1,ids}, { withCredentials: true });
  }
}
