import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { firstValueFrom, interval, concatMap, Observable } from 'rxjs';
import { CSVMapping, UpdateMapping, UpdateOptions } from '../../../../output-interfaces/Config'

@Injectable({
  providedIn: 'root'
})
export class EnrichService {

  constructor(private http:HttpClient) { }

  getEnrichs() {
    return this.http.get<{path:string, label:string}[]>(environment.api + 'enrich')
  }

  async isRunning() {
    let res = [];
    let imports = await firstValueFrom(this.getEnrichs());
    for (let im of imports) {
      let response = await firstValueFrom(this.http.get<{progress:number, status:string}>(environment.api + 'enrich/'+im.path))
      if (response?.progress != 0) res.push(im);
    }
    return res;
  }

  async getStatus() {
    let res = [];
    let imports = await firstValueFrom(this.getEnrichs());
    for (let im of imports) {
      let response = await firstValueFrom(this.http.get<{progress:number, status:string}>(environment.api + 'enrich/'+im.path))
      res.push(response.status);
    }
    return res;
  }

  getProgress(import_path:string):Observable<{progress:number, status:string}> {
    let timer = interval(500);
    return timer.pipe(concatMap(data => {
      //console.log(new Date())
      return this.http.get<{progress:number, status:string}>(environment.api + 'enrich/'+import_path)
    }))
  }

  startYear(import_path:string, reporting_year:number) {
    return this.http.post(environment.api + 'enrich/'+import_path, {reporting_year})
  }
  startID(import_path:string, ids:number[]) {
    return this.http.post(environment.api + 'enrich/'+import_path, {ids})
  }

  getConfig(import_path:string) {
    return this.http.get<UpdateMapping>(environment.api + 'enrich/'+import_path+'/config')
  }
  setConfig(import_path:string, mapping:UpdateMapping) {
    return this.http.post<UpdateMapping>(environment.api + 'enrich/'+import_path+'/config', {mapping})
  }
}
