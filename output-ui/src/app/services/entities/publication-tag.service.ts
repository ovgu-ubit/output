import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IndexPage, IndexPageRequest, PublicationTag, PublicationTagIndex } from '@output/interfaces';
import { RuntimeConfigService } from '../runtime-config.service';
import { map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PublicationTagService {
  constructor(private http: HttpClient, private runtime: RuntimeConfigService) { }
  private get url() { return this.runtime.getValue('api') + 'publication-tags'; }
  getAll() { return this.http.get<PublicationTag[]>(this.url, { withCredentials: true }); }
  getOne(id: number) { return this.http.get<PublicationTag>(this.url + '/one', { params: { id }, withCredentials: true }); }
  indexPage(request: IndexPageRequest) {
    return this.http.post<IndexPage<PublicationTagIndex>>(this.url + '/index-page', request, { withCredentials: true });
  }
  add(tag: PublicationTag) { return this.http.post<PublicationTag>(this.url, tag, { withCredentials: true }); }
  update(tag: PublicationTag) { return this.http.put<PublicationTag>(this.url, tag, { withCredentials: true }); }
  delete(ids: number[]) { return this.http.delete(this.url, { body: { ids }, withCredentials: true }).pipe(map(() => [] as PublicationTag[])); }
}
