import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { FilterOptions, GROUP, HighlightOptions, STATISTIC, TIMEFRAME } from '../../../../output-interfaces/Statistics';
import { RuntimeConfigService } from '../services/runtime-config.service';

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {

  constructor(private http: HttpClient, private runtimeConfigService:RuntimeConfigService) { }

  countPubByYear(filterOptions?: FilterOptions, highlightOptions?: HighlightOptions) {
    return this.http.post<{ pub_year: number, value: number, highlight?: number }[]>(this.runtimeConfigService.getValue("api") + 'statistics/publication_statistic',
      {
        year: 1,
        statistic: STATISTIC.COUNT,
        group: [],
        timeframe: TIMEFRAME.ALL_YEARS,
        filterOptions,
        highlightOptions
      })
      .pipe(map(e => e.map(e1 => {
        return { pub_year: Number(e1.pub_year), count: Number(e1.value), highlight: Number(e1.highlight) }
      })))
  }

  countPubByYearAndOACat(filterOptions?: FilterOptions) {
    return this.http.post<{ pub_year: number, value: number, oa_category: string, oa_category_id: number }[]>(this.runtimeConfigService.getValue("api") + 'statistics/publication_statistic',
      {
        year: 1,
        statistic: STATISTIC.COUNT,
        group: [6],
        timeframe: TIMEFRAME.ALL_YEARS,
        filterOptions
      })
      .pipe(map(e => e.map(e1 => {
        return { pub_year: e1.pub_year, count: e1.value, oa_category: e1.oa_category }
      })))
  }

  countPubByYearAndPubType(filterOptions?: FilterOptions) {
    return this.http.post<{ pub_year: number, value: number, pub_type: string, pub_type_id: number }[]>(this.runtimeConfigService.getValue("api") + 'statistics/publication_statistic',
      {
        year: 1,
        statistic: STATISTIC.COUNT,
        group: [4],
        timeframe: TIMEFRAME.ALL_YEARS,
        filterOptions
      })
      .pipe(map(e => e.map(e1 => {
        return { pub_year: e1.pub_year, count: e1.value, pub_type: e1.pub_type }
      })))
  }

  corresponding(year: number, costs?: boolean, filterOptions?: FilterOptions) {
    return this.http.post<{ corresponding_any: boolean, value: number }[]>(this.runtimeConfigService.getValue("api") + 'statistics/publication_statistic',
      {
        year,
        statistic: costs ? STATISTIC.NET_COSTS : STATISTIC.COUNT,
        group: [GROUP.CORRESPONDING_ANY],
        timeframe: TIMEFRAME.CURRENT_YEAR,
        filterOptions
      })
      .pipe(map(e => e.map(e1 => {
        return { corresponding: e1.corresponding_any, value: e1.value }
      })))
  }

  locked(year: number, filterOptions?: FilterOptions) {
    return this.http.post<{ locked: boolean, value: number }[]>(this.runtimeConfigService.getValue("api") + 'statistics/publication_statistic',
      {
        year,
        statistic: STATISTIC.COUNT,
        group: [GROUP.LOCK],
        timeframe: TIMEFRAME.CURRENT_YEAR,
        filterOptions
      })
      .pipe(map(e => e.map(e1 => {
        return { locked: e1.locked, value: e1.value }
      })))
  }

  institute(year: number, costs: boolean, filterOptions?: FilterOptions) {
    return this.http.post<{ institute_corr: string, institute_corr_id: number, value: number }[]>(this.runtimeConfigService.getValue("api") + 'statistics/publication_statistic',
      {
        year,
        statistic: costs ? STATISTIC.NET_COSTS : STATISTIC.COUNT,
        group: [GROUP.INSTITUTE_CORRESPONDING],
        timeframe: TIMEFRAME.CURRENT_YEAR,
        filterOptions
      })
      .pipe(map(e => e.map(e1 => {
        return { id: e1.institute_corr_id, institute: e1.institute_corr, value: e1.value }
      })))
  }

  oaCat(year: number, costs: boolean, filterOptions?: FilterOptions) {
    return this.http.post<{ oa_category: string, oa_category_id: number, value: number }[]>(this.runtimeConfigService.getValue("api") + 'statistics/publication_statistic',
      {
        year,
        statistic: costs ? STATISTIC.NET_COSTS : STATISTIC.COUNT,
        group: [GROUP.OA_CATEGORY],
        timeframe: TIMEFRAME.CURRENT_YEAR,
        filterOptions
      })
      .pipe(map(e => e.map(e1 => {
        return { id: e1.oa_category_id, oa_cat: e1.oa_category, value: e1.value }
      })))
  }

  publisher(year: number, costs: boolean, filterOptions?: FilterOptions) {
    return this.http.post<{ publisher: string, publisher_id: number, value: number }[]>(this.runtimeConfigService.getValue("api") + 'statistics/publication_statistic',
      {
        year,
        statistic: costs ? STATISTIC.NET_COSTS : STATISTIC.COUNT,
        group: [GROUP.PUBLISHER],
        timeframe: TIMEFRAME.CURRENT_YEAR,
        filterOptions
      })
      .pipe(map(e => e.map(e1 => {
        return { id: e1.publisher_id, publisher: e1.publisher, value: e1.value }
      })))
  }

  pub_type(year: number, costs: boolean, filterOptions?: FilterOptions) {
    return this.http.post<{ pub_type: string, pub_type_id: number, value: number }[]>(this.runtimeConfigService.getValue("api") + 'statistics/publication_statistic',
      {
        year,
        statistic: costs ? STATISTIC.NET_COSTS : STATISTIC.COUNT,
        group: [GROUP.PUB_TYPE],
        timeframe: TIMEFRAME.CURRENT_YEAR,
        filterOptions
      })
      .pipe(map(e => e.map(e1 => {
        return { id: e1.pub_type_id, pub_type: e1.pub_type, value: e1.value }
      })))
  }

  contract(year: number, costs: boolean, filterOptions?: FilterOptions) {
    return this.http.post<{ contract: string, contract_id: number, value: number }[]>(this.runtimeConfigService.getValue("api") + 'statistics/publication_statistic',
      {
        year,
        statistic: costs ? STATISTIC.NET_COSTS : STATISTIC.COUNT,
        group: [GROUP.CONTRACT],
        timeframe: TIMEFRAME.CURRENT_YEAR,
        filterOptions
      })
      .pipe(map(e => e.map(e1 => {
        return { id: e1.contract_id, contract: e1.contract, value: e1.value }
      })))
  }
}
