import { Injectable } from '@angular/core';
import { Sort, SortDirection } from '@angular/material/sort';
import { FormControl } from '@angular/forms';
import { defer, finalize, map, Observable, of, Subject, switchMap, takeUntil } from 'rxjs';
import { IndexEntityService } from 'src/app/services/entities/service.interface';
import { TableHeader, TableParent } from 'src/app/table/table.interface';
import { Entity, IndexColumnFilters, IndexPage, IndexPageRequest, IndexSortCriterion } from '@output/interfaces';

@Injectable()
export class TableDataService<T extends Entity, E extends Entity> {
  public dataSource: T[] = [];
  
  public sort_state: { key: string, dir: SortDirection }[] = [];
  public filterValues: Map<string, string> = new Map();
  public searchControl = new FormControl('');
  public filterControls: { [key: string]: FormControl } = {};
  public columnFilter = false;
  public loading = true;
  public filterName = false;
  public total = 0;
  public page = 0;
  public pageSize = 10;

  private serviceClass: IndexEntityService<E, T>;
  private parent: TableParent<T>;
  private reporting_year: number | null;
  private headers: TableHeader[];
  private destroy$ = new Subject<void>();
  private reload$ = new Subject<void>();

  init(
    serviceClass: IndexEntityService<E, T>,
    parent: TableParent<T>,
    headers: TableHeader[]
  ) {
    this.serviceClass = serviceClass;
    this.parent = parent;
    this.setHeaders(headers);
  }

  setHeaders(headers: TableHeader[]) {
    this.headers = headers ?? [];
  }

  setReportingYear(year: number | null) {
    this.reporting_year = year;
  }

  destroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.reload$.complete();
  }

  public update(data: T[]) {
    if ((this.parent.indexOptions?.filter && this.parent.indexOptions?.filter.expressions?.length > 0) || (this.parent.indexOptions?.paths && this.parent.indexOptions?.paths.length > 0)) {
      this.filterName = true;
    } else {
      this.filterName = false;
    }
    
    this.dataSource = data;
    return data;
  }

  public updateData(): Observable<T[]> {
    return defer(() => {
      this.reload$.next();
      this.loading = true;
      const request = this.pageRequest();
      const source = this.loadPage(request).pipe(
        switchMap(result => {
          const lastPage = Math.max(0, Math.ceil(result.total / result.page_size) - 1);
          return result.page > lastPage ? this.loadPage({ ...request, page: lastPage }) : of(result);
        }),
        map(result => {
          this.total = result.total;
          this.page = result.page;
          this.pageSize = result.page_size;
          return result.items;
        }),
      );

      return source.pipe(
        map(data => this.update(data)),
        finalize(() => this.loading = false),
        takeUntil(this.reload$),
        takeUntil(this.destroy$),
      );
    });
  }

  private loadPage(request: IndexPageRequest): Observable<IndexPage<T>> {
    return this.parent.loadPage
      ? this.parent.loadPage(request, this.reporting_year)
      : this.serviceClass.indexPage({ ...request, reporting_year: this.reporting_year }, this.parent.indexOptions);
  }

  public announceSortChange(sortState: Sort) {
    this.sort_state = this.sort_state.filter(e => e.key !== sortState.active);
    if (sortState?.direction) {
      this.sort_state.push({ key: sortState.active, dir: sortState.direction });
    }
  }

  public setPage(page: number, pageSize: number): void {
    this.page = page;
    this.pageSize = pageSize;
  }

  public resetPage(): void {
    this.page = 0;
  }

  private pageRequest(): IndexPageRequest<string> {
    const sort: IndexSortCriterion<string>[] = this.sort_state
      .filter(entry => !!entry.dir && (entry.key !== 'edit' || this.headers.some(header => header.colName === 'locked') || !!this.parent.loadPage))
      .map(entry => ({
        key: entry.key === 'edit' ? 'locked' : entry.key,
        direction: entry.dir as 'asc' | 'desc',
      }));
    const column_filters: IndexColumnFilters<string> = {};
    if (this.columnFilter) this.filterValues.forEach((value, key) => {
        const normalized = this.normalizeColumnFilter(key, value);
        if (normalized) column_filters[key] = normalized;
      });
    const q = this.searchControl.value?.trim();

    return {
      page: this.page,
      page_size: this.pageSize,
      sort,
      q: q || undefined,
      column_filters,
    };
  }

  private normalizeColumnFilter(key: string, value: string): string {
    let normalized = value?.trim() ?? '';
    const type = this.headers.find(header => header.colName === key)?.type;
    if (type === 'number') normalized = normalized.replaceAll('.', '');
    if (type === 'euro') normalized = normalized.replaceAll(' €', '').replace(',', '.');
    return normalized;
  }

}
