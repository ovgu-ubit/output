import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { firstValueFrom, interval, concatMap, Observable, map } from 'rxjs';
import { CSVMapping, UpdateMapping, UpdateOptions } from '../../../../output-interfaces/Config'
import { FilterOptions, GROUP, HighlightOptions, STATISTIC, TIMEFRAME } from '../../../../output-interfaces/Statistics';

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {

  constructor(private http:HttpClient) { }

  countPubByYear(filterOptions?:FilterOptions, highlightOptions?: HighlightOptions) {
    return this.http.post<{pub_year:number, value:number, highlight?:number}[]>(environment.api + 'statistics/publication_statistic',
      {
        year: 1, 
        statistic: STATISTIC.COUNT,
        group: [],
        timeframe: TIMEFRAME.ALL_YEARS,
        filterOptions,
        highlightOptions})
      .pipe(map(e => e.map(e1 => {
      return {pub_year:Number(e1.pub_year),count:Number(e1.value),highlight:Number(e1.highlight)}})))  
  }

  corresponding(year:number, costs?:boolean, filterOptions?:FilterOptions) {
    return this.http.post<{corresponding_any: boolean, value:number}[]>(environment.api + 'statistics/publication_statistic',
      {
        year, 
        statistic: costs? STATISTIC.NET_COSTS : STATISTIC.COUNT,
        group: [GROUP.CORRESPONDING_ANY],
        timeframe: TIMEFRAME.CURRENT_YEAR,
        filterOptions
      })
      .pipe(map(e => e.map(e1 => {
        return {corresponding: e1.corresponding_any, value: e1.value}})))  
  }

  locked(year:number,filterOptions?:FilterOptions) {
    return this.http.post<{locked: boolean, value:number}[]>(environment.api + 'statistics/publication_statistic',
      {
        year, 
        statistic: STATISTIC.COUNT,
        group: [GROUP.LOCK],
        timeframe: TIMEFRAME.CURRENT_YEAR,
        filterOptions
      })
      .pipe(map(e => e.map(e1 => {
        return {locked: e1.locked, value: e1.value}})))  
  }

  institute(year:number, costs:boolean,filterOptions?:FilterOptions) {
    return this.http.post<{institute_first: string, institute_id: number, value:number}[]>(environment.api + 'statistics/publication_statistic',
      {
        year, 
        statistic: costs? STATISTIC.NET_COSTS : STATISTIC.COUNT,
        group: [GROUP.INSTITUTE_FIRST],
        timeframe: TIMEFRAME.CURRENT_YEAR,
        filterOptions
      })
      .pipe(map(e => e.map(e1 => {
        return {id: e1.institute_id, institute:e1.institute_first, value: e1.value}})))  
  }

  oaCat(year:number, costs:boolean,filterOptions?:FilterOptions) {
    return this.http.post<{oa_category: string, oa_category_id: number, value:number}[]>(environment.api + 'statistics/publication_statistic',
      {
        year, 
        statistic: costs? STATISTIC.NET_COSTS : STATISTIC.COUNT,
        group: [GROUP.OA_CATEGORY],
        timeframe: TIMEFRAME.CURRENT_YEAR,
        filterOptions
      })
      .pipe(map(e => e.map(e1 => {
        return {id: e1.oa_category_id, oa_cat:e1.oa_category, value: e1.value}})))  
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
