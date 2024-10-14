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

  corresponding(year:number,filterOptions?:FilterOptions) {
    return this.http.post<{value, corresponding}[]>(environment.api + 'statistics/corresponding?year='+year,{filterOptions})
  }

  locked(year:number,filterOptions?:FilterOptions) {
    return this.http.post<{value, locked}[]>(environment.api + 'statistics/locked?year='+year,{filterOptions})
  }

  institute(year:number, costs:boolean,filterOptions?:FilterOptions) {
    return this.http.post<{id, institute, value}[]>(environment.api + 'statistics/institute?year='+year+'&costs='+costs,{filterOptions})
  }

  oaCat(year:number, costs:boolean,filterOptions?:FilterOptions) {
    return this.http.post<{id, oa_cat, value}[]>(environment.api + 'statistics/oa_cat?year='+year+'&costs='+costs,{filterOptions})
  }

  publisher(year:number, costs:boolean,filterOptions?:FilterOptions) {
    return this.http.post<{id, publisher, value}[]>(environment.api + 'statistics/publisher?year='+year+'&costs='+costs,{filterOptions})
  }

  pub_type(year:number, costs:boolean,filterOptions?:FilterOptions) {
    return this.http.post<{id, pub_type, value}[]>(environment.api + 'statistics/pub_type?year='+year+'&costs='+costs,{filterOptions})
  }

  contract(year:number, costs:boolean,filterOptions?:FilterOptions) {
    return this.http.post<{id, contract, value}[]>(environment.api + 'statistics/contract?year='+year+'&costs='+costs,{filterOptions})
  }
}
