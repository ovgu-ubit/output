import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { AuthorIndex, PublicationIndex } from '../../../../../output-interfaces/PublicationIndex'
import { Author, Publication, PublicationType } from '../../../../../output-interfaces/Publication'
import { EntityService } from 'src/app/interfaces/service';

@Injectable({
  providedIn: 'root'
})
export class AuthorService implements EntityService<Author, AuthorIndex> {

  constructor(private http: HttpClient) { }

  public getAll() {
    return this.http.get<Author[]>(environment.api + 'authors', { withCredentials: true });
  }

  public index(reporting_year: number) {
    return this.http.get<AuthorIndex[]>(environment.api + 'authors/index?reporting_year=' + reporting_year, { withCredentials: true });
  }

  public getOne(id: number) {
    return this.http.get<Author>(environment.api + 'authors/' + id, { withCredentials: true });
  }

  public add(author: Author) {
    return this.http.post<Author>(environment.api + 'authors', author, { withCredentials: true });
  }

  public update(author: Author) {
    return this.http.put<Author>(environment.api + 'authors', author, { withCredentials: true });
  }

  public delete(ids: number[]) {
    return this.http.delete<Author[]>(environment.api + 'authors', { withCredentials: true, body: ids.map(e => ({ id: e })) });
  }

  public combine(id1: number, ids: number[], options?: { aliases_first_name?: string[], aliases_last_name?: string[] }) {
    return this.http.post(environment.api + 'authors/combine', { id1, ids, aliases_first_name: options?.aliases_first_name, aliases_last_name: options?.aliases_last_name }, { withCredentials: true });
  }
}
