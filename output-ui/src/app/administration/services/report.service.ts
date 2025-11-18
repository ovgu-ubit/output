import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RuntimeConfigService } from 'src/app/services/runtime-config.service';

@Injectable({
  providedIn: 'root'
})
export class ReportService {

  constructor(private http:HttpClient, private runtimeConfigService:RuntimeConfigService) { }

  getReports(type:string) {
    return this.http.get<string[]>(this.runtimeConfigService.getValue("api") + type + '/reports')
  }

  getReport(type:string, filename:string) {
    return this.http.get(this.runtimeConfigService.getValue("api") + type + '/report?filename='+filename, {responseType: 'text'})
  }

  deleteReport(type:string, filename:string) {
    return this.http.delete(this.runtimeConfigService.getValue("api") + type + '/report', {body: {filename}})
  }
}
