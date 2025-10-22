import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportService {

  constructor(private http:HttpClient) { }

  getReports(type:string) {
    return this.http.get<string[]>(environment.api + type + '/reports')
  }

  getReport(type:string, filename:string) {
    return this.http.get(environment.api + type + '/report?filename='+filename, {responseType: 'text'})
  }

  deleteReport(type:string, filename:string) {
    return this.http.delete(environment.api + type + '/report', {body: {filename}})
  }
}
