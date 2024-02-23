import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { firstValueFrom, interval, concatMap, Observable, map } from 'rxjs';
import { CSVMapping, UpdateMapping, UpdateOptions } from '../../../../output-interfaces/Config'
import { FilterOptions, HighlightOptions } from '../../../../output-interfaces/Statistics';

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {

  constructor(private http:HttpClient) { }

  countPubByYear(filterOptions?:FilterOptions, highlightOptions?: HighlightOptions) {
    return this.http.post<{pub_year:number, count:number, highlight?:number}[]>(environment.api + 'statistics/count_by_year',{filterOptions,highlightOptions}).pipe(map(e => e.map(e1 => {
      return {pub_year:Number(e1.pub_year),count:Number(e1.count),highlight:Number(e1.highlight)}})))
  }

  corresponding(year:number) {
    return this.http.get<{count, corresponding}[]>(environment.api + 'statistics/corresponding?year='+year)
  }

  institute(year:number) {
    return this.http.get<{institute, count}[]>(environment.api + 'statistics/institute?year='+year)
  }

  oaCat(year:number) {
    return this.http.get<{oa_cat, count}[]>(environment.api + 'statistics/oa_cat?year='+year)
  }

  publisher(year:number) {
    return this.http.get<{publisher, count}[]>(environment.api + 'statistics/publisher?year='+year)
  }

  pub_type(year:number) {
    return this.http.get<{pub_type, count}[]>(environment.api + 'statistics/pub_type?year='+year)
  }

  contract(year:number) {
    return this.http.get<{contract, count}[]>(environment.api + 'statistics/contract?year='+year)
  }
}
