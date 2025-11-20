import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Publisher } from '../../../../../output-interfaces/Publication';
import { PublisherIndex } from '../../../../../output-interfaces/PublicationIndex';
import { EntityService } from 'src/app/services/entities/service.interface';
import { RuntimeConfigService } from '../runtime-config.service';

@Injectable({
  providedIn: 'root'
})
export class PublisherService implements EntityService<Publisher, PublisherIndex> {

  constructor(private http: HttpClient, private runtimeConfigService:RuntimeConfigService) { }

  public getAll() {
    return this.http.get<Publisher[]>(this.runtimeConfigService.getValue("api") + 'publisher', { withCredentials: true });
  }
  public getOne(id: number) {
    return this.http.get<Publisher>(this.runtimeConfigService.getValue("api") + 'publisher/one?id=' + id, { withCredentials: true });
  }
  public add(ge: Publisher) {
    return this.http.post<Publisher>(this.runtimeConfigService.getValue("api") + 'publisher', ge, { withCredentials: true });
  }
  public update(ge: Publisher) {
    return this.http.put<Publisher>(this.runtimeConfigService.getValue("api") + 'publisher', ge, { withCredentials: true });
  }
  public index(reporting_year: number) {
    return this.http.get<PublisherIndex[]>(this.runtimeConfigService.getValue("api") + 'publisher/index?reporting_year=' + reporting_year, { withCredentials: true });
  }
  public delete(ids: number[]) {
    return this.http.delete<Publisher[]>(this.runtimeConfigService.getValue("api") + 'publisher', { withCredentials: true, body: ids.map(e => ({ id: e })) });
  }
  public combine(id1: number, ids: number[], options?: { aliases: string[] }) {
    return this.http.post(this.runtimeConfigService.getValue("api") + 'publisher/combine', { id1, ids, aliases: options.aliases }, { withCredentials: true });
  }
}
