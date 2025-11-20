import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, interval, concatMap, Observable } from 'rxjs';
import { RuntimeConfigService } from 'src/app/services/runtime-config.service';

@Injectable({
  providedIn: 'root'
})
export class PlausibilityService {

  constructor(private http:HttpClient, private runtimeConfigService:RuntimeConfigService) { }

  getExports() {
    return this.http.get<{path:string, label:string}[]>(this.runtimeConfigService.getValue("api") + 'check')
  }

  async isRunning() {
    let res = [];
    let imports = await firstValueFrom(this.getExports());
    for (let im of imports) {
      let response = await firstValueFrom(this.http.get<{progress:number, status:string}>(this.runtimeConfigService.getValue("api") + 'check/'+im.path))
      if (response?.progress != 0) res.push(im);
    }
    return res;
  }

  async getStatus() {
    let res = [];
    let imports = await firstValueFrom(this.getExports());
    for (let im of imports) {
      let response = await firstValueFrom(this.http.get<{progress:number, status:string}>(this.runtimeConfigService.getValue("api") + 'check/'+im.path))
      res.push(response.status);
    }
    return res;
  }

  getProgress(import_path:string):Observable<{progress:number, status:string}> {
    let timer = interval(500);
    return timer.pipe(concatMap(data => {
      //console.log(new Date())
      return this.http.get<{progress:number, status:string}>(this.runtimeConfigService.getValue("api") + 'check/'+import_path)
    }))
  }

  startExport(path:string) {
    return this.http.post(this.runtimeConfigService.getValue("api") + 'check/'+path, {}, { responseType: 'text' })
  }
}
