import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { firstValueFrom, interval, concatMap, Observable } from 'rxjs';
import { CSVMapping, UpdateMapping, UpdateOptions } from 'output-interfaces/Config';

@Injectable({
  providedIn: 'root'
})
export class ImportService {

  constructor(private http:HttpClient) { }

  getImports() {
    return this.http.get<{path:string, label:string}[]>(environment.api + 'import')
  }

  async isRunning() {
    let res = [];
    let imports = await firstValueFrom(this.getImports());
    for (let im of imports) {
      let response = await firstValueFrom(this.http.get<{progress:number, status:string}>(environment.api + 'import/'+im.path))
      if (response?.progress != 0) res.push(im);
    }
    return res;
  }

  async getStatus() {
    let res = [];
    let imports = await firstValueFrom(this.getImports());
    for (let im of imports) {
      let response = await firstValueFrom(this.http.get<{progress:number, status:string}>(environment.api + 'import/'+im.path))
      res.push(response.status);
    }
    return res;
  }

  getProgress(import_path:string):Observable<{progress:number, status:string}> {
    let timer = interval(500);
    return timer.pipe(concatMap(data => {
      //console.log(new Date())
      return this.http.get<{progress:number, status:string}>(environment.api + 'import/'+import_path)
    }))
  }

  start(import_path:string, update:boolean, reporting_year:number) {
    return this.http.post(environment.api + 'import/'+import_path, {reporting_year, update})
  }
  startCSV(formData:FormData) {
    return this.http.post(environment.api + 'import/csv', formData)
  }
  startExcel(formData:FormData) {
    return this.http.post(environment.api + 'import/xls', formData)
  }

  getConfig(import_path:string) {
    return this.http.get<UpdateMapping>(environment.api + 'import/'+import_path+'/config')
  }
  setConfig(import_path:string, mapping:UpdateMapping) {
    return this.http.post<UpdateMapping>(environment.api + 'import/'+import_path+'/config', {mapping})
  }

  getCSVMappings() {
    return this.http.get<CSVMapping[]>(environment.api + 'import/csv/mapping')
  }
  setCSVMapping(mapping:CSVMapping) {
    return this.http.post<CSVMapping>(environment.api + 'import/csv/mapping',mapping)
  }
  deleteCSVMapping(mapping:CSVMapping) {
    return this.http.delete<any>(environment.api + 'import/csv/mapping', { withCredentials: true, body:  mapping })
  }
}
