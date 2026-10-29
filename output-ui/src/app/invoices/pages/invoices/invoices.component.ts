import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CostCenter, CostType, Contract, InvoiceContext, InvoiceIndex, InvoiceIndexPage, InvoiceIndexQuery, InvoiceIndexSortField, InvoiceKind } from '@output/interfaces';
import { catchError, combineLatest, defer, finalize, forkJoin, of, startWith, Subject, switchMap, takeUntil } from 'rxjs';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { ContractService } from 'src/app/services/entities/contract.service';
import { CostCenterService } from 'src/app/services/entities/cost-center.service';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';
import { InvoiceIndexService } from 'src/app/services/entities/invoice-index.service';
import { RuntimeConfigService } from 'src/app/services/runtime-config.service';
import { SharedModule } from 'src/app/shared/shared.module';
import { MatPaginatorDE } from 'src/app/table/mat-paginator-de';
import { INVOICE_DATE_FILTERS, INVOICE_ID_FILTERS, INVOICE_INDEX_DEFAULTS, INVOICE_YEAR_FILTERS, invoiceIndexQueryParams, parseInvoiceIndexQuery } from '../../invoice-index-query';

function dateRangeValidator(control: AbstractControl): ValidationErrors | null {
  for (const prefix of ['date', 'booking_date']) {
    const from = control.get(`${prefix}_from`)?.value;
    const to = control.get(`${prefix}_to`)?.value;
    if (from && to && from > to) return { dateRange: true };
  }
  return null;
}

@Component({
  selector: 'app-invoices',
  templateUrl: './invoices.component.html',
  styleUrls: ['../../../table/table-appearance.css', './invoices.component.css'],
  standalone: true,
  imports: [SharedModule, ClipboardModule, MatPaginatorModule, MatSortModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [{ provide: MatPaginatorIntl, useClass: MatPaginatorDE }],
})
export class InvoicesComponent implements OnInit, OnDestroy {
  readonly kind = InvoiceKind;
  readonly contextLabels: Record<InvoiceContext, string> = {
    publication: 'Publikation', contract_component: 'Vertragskomponente', both: 'Publikation und Vertragskomponente', unassigned: 'Ohne Zuordnung',
  };
  readonly years = [
    { key: 'invoice_year', label: 'Rechnungsjahr' },
    { key: 'booking_year', label: 'Buchungsjahr' },
    { key: 'publication_year', label: 'Publikationsjahr' },
  ];
  readonly dates = [
    { key: 'date_from', label: 'Rechnungsdatum von' },
    { key: 'date_to', label: 'Rechnungsdatum bis' },
    { key: 'booking_date_from', label: 'Buchungsdatum von' },
    { key: 'booking_date_to', label: 'Buchungsdatum bis' },
  ];
  readonly columns = ['id', 'invoice_kind', 'number', 'date', 'booking_date', 'cost_center', 'publication', 'contract', 'cost_types', 'costs_eur', 'net_amount_eur', 'vat_amount_eur', 'gross_amount_eur', 'booking_amount', 'item_count', 'issues'];
  readonly moneyColumns = [
    { key: 'costs_eur', label: 'Kosten (brutto) EUR' },
    { key: 'net_amount_eur', label: 'Netto EUR' },
    { key: 'vat_amount_eur', label: 'MwSt. EUR' },
    { key: 'gross_amount_eur', label: 'Brutto EUR' },
    { key: 'booking_amount', label: 'Buchungsbetrag EUR' },
  ];
  readonly filterLabels: Record<string, string> = {
    q: 'Suche', invoice_kind: 'Belegart', invoice_year: 'Rechnungsjahr', booking_year: 'Buchungsjahr',
    publication_year: 'Publikationsjahr', date_from: 'Rechnungsdatum von', date_to: 'Rechnungsdatum bis',
    booking_date_from: 'Buchungsdatum von', booking_date_to: 'Buchungsdatum bis',
    cost_center_id: 'Kostenstelle', cost_type_id: 'Kostenart', contract_id: 'Vertrag',
    contract_component_id: 'Vertragskomponente (ID)', publication_id: 'Publikation (ID)',
    context: 'Zuordnung', invoice_date_missing: 'Rechnungsdatum',
  };
  query: InvoiceIndexQuery = { ...INVOICE_INDEX_DEFAULTS };
  result: InvoiceIndexPage = { items: [], total: 0, page: 0, page_size: 50 };
  loading = false;
  loadFailed = false;
  costCenters: CostCenter[] = [];
  costTypes: CostType[] = [];
  contracts: Contract[] = [];
  form: FormGroup;
  private readonly destroy$ = new Subject<void>();
  private readonly refresh$ = new Subject<void>();
  private readonly currency = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

  constructor(
    formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private invoiceIndex: InvoiceIndexService,
    private costCenterService: CostCenterService,
    private costTypeService: CostTypeService,
    private contractService: ContractService,
    private errorPresentation: ErrorPresentationService,
    private clipboard: Clipboard,
    private runtimeConfig: RuntimeConfigService,
    private snackBar: MatSnackBar,
  ) {
    const positiveInteger = [Validators.pattern(/^\d+$/), Validators.min(1), Validators.max(2147483647)];
    const group: Record<string, unknown> = {
      q: ['', Validators.maxLength(200)], invoice_kind: [''], context: [''], invoice_date_missing: [''],
    };
    for (const key of INVOICE_ID_FILTERS) group[key] = ['', positiveInteger];
    for (const key of INVOICE_YEAR_FILTERS) group[key] = ['', [Validators.pattern(/^\d+$/), Validators.min(1), Validators.max(9999)]];
    for (const key of INVOICE_DATE_FILTERS) group[key] = [''];
    this.form = formBuilder.group(group, { validators: dateRangeValidator });
  }

  ngOnInit(): void {
    forkJoin({
      centers: this.costCenterService.getAll(), types: this.costTypeService.getAll(), contracts: this.contractService.getAll(),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: lookups => {
        this.costCenters = lookups.centers.sort((a, b) => (a.label ?? '').localeCompare(b.label ?? '', 'de'));
        this.costTypes = lookups.types.sort((a, b) => a.label.localeCompare(b.label, 'de'));
        this.contracts = lookups.contracts.sort((a, b) => a.label.localeCompare(b.label, 'de'));
      },
      error: error => this.errorPresentation.present(error, { action: 'load', entity: 'Filteroptionen' }),
    });

    combineLatest([this.route.queryParamMap, this.refresh$.pipe(startWith(undefined))]).pipe(
      switchMap(([params]) => defer(() => {
        this.query = parseInvoiceIndexQuery(params);
        this.patchForm();
        this.loading = true;
        this.loadFailed = false;
        return this.invoiceIndex.index(this.query).pipe(
          catchError(error => {
            this.loadFailed = true;
            this.errorPresentation.present(error, { action: 'load', entity: 'Rechnungen' });
            return of({ items: [], total: 0, page: this.query.page, page_size: this.query.page_size } as InvoiceIndexPage);
          }),
          finalize(() => this.loading = false),
        );
      })),
      takeUntil(this.destroy$),
    ).subscribe(result => this.result = result);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  applyFilters(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const query: InvoiceIndexQuery = { ...INVOICE_INDEX_DEFAULTS, page_size: this.query.page_size, sort: this.query.sort, sort_dir: this.query.sort_dir };
    for (const [key, value] of Object.entries(this.form.getRawValue())) {
      if (value !== '' && value !== null && value !== undefined) query[key] = value;
    }
    this.navigate(query);
  }

  clearFilters(): void {
    this.navigate({ ...INVOICE_INDEX_DEFAULTS, page_size: this.query.page_size });
  }

  reload(): void {
    this.refresh$.next();
  }

  removeFilter(key: string): void {
    const query = { ...this.query, page: 0 };
    delete query[key];
    this.navigate(query);
  }

  get activeFilters(): Array<{ key: string; label: string }> {
    return Object.entries(this.query)
      .filter(([key, value]) => this.filterLabels[key] && value !== undefined)
      .map(([key, value]) => ({ key, label: `${this.filterLabels[key]}: ${this.filterValueLabel(key, value)}` }));
  }

  pageChanged(event: PageEvent): void {
    this.navigate({ ...this.query, page: event.pageIndex, page_size: event.pageSize });
  }

  sortChanged(sort: Sort): void {
    this.navigate({ ...this.query, page: 0, sort: sort.active as InvoiceIndexSortField, sort_dir: sort.direction || 'desc' });
  }

  copyLink(): void {
    const configuredBase = this.runtimeConfig.getValue<string>('self');
    const base = configuredBase || `${window.location.origin}/`;
    const path = this.router.url.replace(/^\//, '');
    if (this.clipboard.copy(new URL(path, base.endsWith('/') ? base : `${base}/`).toString())) {
      this.snackBar.open('Link zur Rechnungsübersicht kopiert.', 'Schließen', { duration: 3000 });
    }
  }

  formatMoney(value: number | null): string {
    return value === null || value === undefined ? '–' : this.currency.format(value);
  }

  issues(invoice: InvoiceIndex): string {
    const issues: string[] = [];
    if (invoice.contract_conflict) issues.push('Abweichende Verträge an Publikation und Vertragskomponente');
    if (invoice.context === 'unassigned') issues.push('Keine Publikation oder Vertragskomponente zugeordnet');
    if (invoice.item_count === 0) issues.push('Keine Rechnungspositionen');
    if (invoice.missing_amount_item_count > 0) issues.push(`${invoice.missing_amount_item_count} Position(en) mit fehlendem Netto- oder MwSt.-Betrag`);
    if (invoice.publication_deleted) issues.push('Publikation ist gelöscht');
    return issues.join('; ');
  }

  private patchForm(): void {
    for (const key of Object.keys(this.form.controls)) this.form.get(key).setValue(this.query[key] ?? '', { emitEvent: false });
  }

  private navigate(query: InvoiceIndexQuery): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: invoiceIndexQueryParams(query) });
  }

  private filterValueLabel(key: string, value: unknown): string {
    if (key === 'invoice_kind') return value === InvoiceKind.PRE_INVOICE ? 'Vorabrechnung' : 'Rechnung';
    if (key === 'invoice_date_missing') return value ? 'ohne Datum' : 'mit Datum';
    if (key === 'context') return this.contextLabels[String(value)] ?? String(value);
    const lookup = key === 'cost_center_id' ? this.costCenters : key === 'cost_type_id' ? this.costTypes : key === 'contract_id' ? this.contracts : [];
    return lookup.find(entry => entry.id === Number(value))?.label ?? String(value);
  }
}
