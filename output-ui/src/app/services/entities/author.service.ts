import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { AuthorIndex, PublicationIndex } from '../../../../../output-interfaces/PublicationIndex'
import { Author, Publication, PublicationType } from '../../../../../output-interfaces/Publication'

@Injectable({
  providedIn: 'root'
})
export class AuthorService {

  constructor(private http: HttpClient) { }

  public getAuthors() {
    return this.http.get<Author[]>(environment.api + 'authors', { withCredentials: true });
  }

  public index(reporting_year:number) {
    return this.http.get<AuthorIndex[]>(environment.api + 'authors/index?reporting_year='+reporting_year, { withCredentials: true });
  }

  public getAuthor(id:number) {
    return this.http.get<Author>(environment.api + 'authors/'+id, { withCredentials: true });
  }

  public getAuthorForAutPub(id:number) {
    return this.http.get<Author>(environment.api + 'authors/autpub/'+id, { withCredentials: true });
  }

  public addAuthor(author:Author) {
    return this.http.post<Author>(environment.api + 'authors', author, { withCredentials: true });
  }

  public update(author:Author) {
    return this.http.put<Author>(environment.api + 'authors', author, { withCredentials: true });
  }
  
  public delete(authors:Author[]) {
    return this.http.delete<Author[]>(environment.api + 'authors', { withCredentials: true, body: authors });
  }
  
  public combine(id1:number, ids:number[]) {
    return this.http.post(environment.api + 'authors/combine', {id1,ids}, { withCredentials: true });
  }
}
