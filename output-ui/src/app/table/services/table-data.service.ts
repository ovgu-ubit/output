import { Injectable } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { Sort, SortDirection } from '@angular/material/sort';
import { FormControl } from '@angular/forms';
import { map, Observable, Subject, takeUntil } from 'rxjs';
import { EntityService } from 'src/app/services/entities/service.interface';
import { TableHeader, TableParent } from 'src/app/table/table.interface';
import { Entity } from '../../../../../output-interfaces/Publication';
import { ViewConfig } from 'src/app/services/redux';

@Injectable()
export class TableDataService<T extends Entity, E extends Entity> {
  public data: Array<T> = [];
  public dataSource: MatTableDataSource<T> = new MatTableDataSource<T>([]);
  public dataSource2: MatTableDataSource<T> = new MatTableDataSource<T>([]);
  
  public sort_state: { key: string, dir: SortDirection }[] = [];
  public filterValues: Map<string, string> = new Map();
  public searchControl = new FormControl('');
  public filterControls: { [key: string]: FormControl } = {};
  public columnFilter = false;
  public loading = true;
  public filterName = false;

  private serviceClass: EntityService<E, T>;
  private parent: TableParent<T>;
  private reporting_year: number;
  private headers: TableHeader[];
  private destroy$ = new Subject<void>();

  init(
    serviceClass: EntityService<E, T>,
    parent: TableParent<T>,
    headers: TableHeader[]
  ) {
    this.serviceClass = serviceClass;
    this.parent = parent;
    this.headers = headers;
  }

  setReportingYear(year: number) {
    this.reporting_year = year;
  }

  destroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public update(data: T[], viewConfig?: ViewConfig) {
    if ((this.parent.indexOptions?.filter && this.parent.indexOptions?.filter.expressions?.length > 0) || (this.parent.indexOptions?.paths && this.parent.indexOptions?.paths.length > 0)) {
      this.filterName = true;
    } else {
      this.filterName = false;
    }
    
    this.data = data;
    this.dataSource.data = data;
    this.dataSource2.data = data;

    this.dataSource.filterPredicate = this.getFilterPredicate();
    this.dataSource2.filterPredicate = this.dataSource.filterPredicate;

    this.sortData();
    
    return data;
  }

  public updateData(): Observable<T[]> {
    this.loading = true;
    return this.serviceClass.index(this.reporting_year, this.parent.indexOptions).pipe(
      map(data => {
        this.loading = false;
        this.update(data);
        return data;
      })
    );
  }

  public doFilter(value: string) {
    if (value !== null && value !== undefined) {
      const filterValue = value.trim().toLocaleLowerCase();
      this.dataSource.filter = filterValue;
      this.dataSource2.filter = filterValue;
    }
  }

  public announceSortChange(sortState: Sort) {
    this.sort_state = this.sort_state.filter(e => e.key !== sortState.active);
    if (sortState?.direction) {
      this.sort_state.push({ key: sortState.active, dir: sortState.direction });
      this.sortData();
    }
  }

  private sortData() {
    this.dataSource.data = this.dataSource.data.sort((a, b) => {
      for (let i = 0; i < this.sort_state.length; i++) {
        if (this.sort_state[i].key === 'edit') {
          return ((a as any)['locked'] > (b as any)['locked'] ? 1 : -1) * (this.sort_state[i].dir === 'asc' ? 1 : -1);
        } else {
          let type = this.headers.find(e => e.colName === this.sort_state[i].key)?.type;
          let compare = this.compare(type, (a as any)[this.sort_state[i].key], (b as any)[this.sort_state[i].key], this.sort_state[i].dir);
          if (compare !== 0) return compare;
        }
      }
      return 0;
    });
  }

  private compare(type: string | undefined, a: any, b: any, dir: SortDirection) {
    if (!a && !b) return 0;
    else if (!a && b) return (dir === 'asc' ? -1 : 1);
    else if (a && !b) return (dir === 'asc' ? 1 : -1);
    
    if ((!type || type === 'string' || type == 'authors') && a) {
      return a.localeCompare(b, 'de-DE') * (dir === 'asc' ? 1 : -1);
    } else if (type === 'date' || type === 'datetime') {
      return (Date.parse(a) < Date.parse(b) ? -1 : 1) * (dir === 'asc' ? 1 : -1);
    } else {
      return (Number(a) < Number(b) ? -1 : 1) * (dir === 'asc' ? 1 : -1);
    }
  }

  private getFilterPredicate() {
    return (data: T, filter: string): boolean => {
      let filterJSON: any;
      try {
        filterJSON = JSON.parse(filter);
      } catch (err) { 
        filterJSON = filter; 
      }
      
      if (typeof filterJSON === 'string' || typeof filterJSON === 'number') {
        let filterStr = String(filter);
        if (filterStr.includes("*") || filterStr.includes("?")) {
          let regex = "^" + filterStr.replaceAll("*", ".*").replaceAll("?", ".");
          let regexp = new RegExp(regex);
          for (let key of Object.keys(data)) {
            if ((data as any)[key]?.toString().toLowerCase().match(regexp)) return true;
          }
          return false;
        } else {
          for (let key of Object.keys(data)) {
            if ((data as any)[key]?.toString().toLowerCase().includes(filterStr)) return true;
          }
          return false;
        }
      } else {
        let result = true;
        for (let key of Object.keys(filterJSON)) {
          if (!filterJSON[key]) continue;
          
          let colType = this.headers.find(e => e.colName === key)?.type;
          if (colType === 'number') filterJSON[key] = filterJSON[key].replaceAll(".", "");
          if (colType === 'euro') filterJSON[key] = filterJSON[key].replaceAll(" €", "");
          
          if (filterJSON[key] && !(filterJSON[key].includes("*") || filterJSON[key].includes("?"))) {
            result = result && ((data as any)[key]?.toString().toLowerCase().includes(filterJSON[key]));
          } else {
            let regex = filterJSON[key].replaceAll("*", ".*").replaceAll("?", ".");
            let regexp = new RegExp(regex);
            result = result && ((data as any)[key]?.toString().toLowerCase().match(regexp));
          }
        }
        return result;
      }
    };
  }
}
