import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, interval, concatMap, Observable } from 'rxjs';
import { CSVMapping, UpdateMapping } from '../../../../../output-interfaces/Config';
import { RuntimeConfigService } from 'src/app/services/runtime-config.service';

@Injectable({
  providedIn: 'root'
})
export class ImportService {

  constructor(private http: HttpClient, private runtimeConfigService:RuntimeConfigService) { }

  getImports() {
    return this.http.get<{ path: string, label: string }[]>(this.runtimeConfigService.getValue("api") + 'import')
  }

  async isRunning() {
    let res = [];
    let imports = await firstValueFrom(this.getImports());
    for (let im of imports) {
      let response = await firstValueFrom(this.http.get<{ progress: number, status: string }>(this.runtimeConfigService.getValue("api") + 'import/' + im.path))
      if (response?.progress != 0) res.push(im);
    }
    return res;
  }

  async getStatus() {
    let res = [];
    let imports = await firstValueFrom(this.getImports());
    for (let im of imports) {
      let response = await firstValueFrom(this.http.get<{ progress: number, status: string }>(this.runtimeConfigService.getValue("api") + 'import/' + im.path))
      res.push(response.status);
    }
    return res;
  }

  getProgress(import_path: string): Observable<{ progress: number, status: string }> {
    let timer = interval(500);
    return timer.pipe(concatMap(data => {
      //console.log(new Date())
      return this.http.get<{ progress: number, status: string }>(this.runtimeConfigService.getValue("api") + 'import/' + import_path)
    }))
  }

  start(import_path: string, update: boolean, reporting_year: number, dryRun: boolean) {
    return this.http.post(this.runtimeConfigService.getValue("api") + 'import/' + import_path, { reporting_year, update, dry_run: dryRun })
  }
  startCSV(formData: FormData) {
    return this.http.post(this.runtimeConfigService.getValue("api") + 'import/csv', formData)
  }
  startExcel(formData: FormData) {
    return this.http.post(this.runtimeConfigService.getValue("api") + 'import/xls', formData)
  }

  getConfig(import_path: string) {
    return this.http.get<UpdateMapping>(this.runtimeConfigService.getValue("api") + 'import/' + import_path + '/config')
  }
  setConfig(import_path: string, mapping: UpdateMapping) {
    return this.http.post<UpdateMapping>(this.runtimeConfigService.getValue("api") + 'import/' + import_path + '/config', { mapping })
  }

  getCSVMappings() {
    return this.http.get<CSVMapping[]>(this.runtimeConfigService.getValue("api") + 'import/csv/mapping')
  }
  setCSVMapping(mapping: CSVMapping) {
    return this.http.post<CSVMapping>(this.runtimeConfigService.getValue("api") + 'import/csv/mapping', mapping)
  }
  deleteCSVMapping(mapping: CSVMapping) {
    return this.http.delete<any>(this.runtimeConfigService.getValue("api") + 'import/csv/mapping', { withCredentials: true, body: mapping })
  }
}
