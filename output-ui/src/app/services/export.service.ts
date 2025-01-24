import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { firstValueFrom, interval, concatMap, Observable } from 'rxjs';
import { CSVMapping, SearchFilter, UpdateMapping, UpdateOptions } from '../../../../output-interfaces/Config'

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor(private http:HttpClient) { }

  getExports() {
    return this.http.get<{path:string, label:string}[]>(environment.api + 'export')
  }

  async isRunning() {
    let res = [];
    let imports = await firstValueFrom(this.getExports());
    for (let im of imports) {
      let response = await firstValueFrom(this.http.get<{progress:number, status:string}>(environment.api + 'export/'+im.path))
      if (response?.progress != 0) res.push(im);
    }
    return res;
  }

  async getStatus() {
    let res = [];
    let imports = await firstValueFrom(this.getExports());
    for (let im of imports) {
      let response = await firstValueFrom(this.http.get<{progress:number, status:string}>(environment.api + 'export/'+im.path))
      res.push(response.status);
    }
    return res;
  }

  getProgress(import_path:string):Observable<{progress:number, status:string}> {
    let timer = interval(500);
    return timer.pipe(concatMap(data => {
      //console.log(new Date())
      return this.http.get<{progress:number, status:string}>(environment.api + 'export/'+import_path)
    }))
  }

  startExport(path:string, filter?:{filter:SearchFilter, paths?:string[]}, withMasterData?:boolean) {
    return this.http.post(environment.api + 'export/'+path, {filter, withMasterData}, {responseType: 'blob' as 'json'})
  }
}
