import { Clipboard } from '@angular/cdk/clipboard';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, ParamMap, Router, provideRouter } from '@angular/router';
import { InvoiceIndex, InvoiceKind } from '@output/interfaces';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { ContractService } from 'src/app/services/entities/contract.service';
import { CostCenterService } from 'src/app/services/entities/cost-center.service';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';
import { InvoiceIndexService } from 'src/app/services/entities/invoice-index.service';
import { RuntimeConfigService } from 'src/app/services/runtime-config.service';
import { InvoicesComponent } from './invoices.component';

describe('InvoicesComponent', () => {
  let fixture: ComponentFixture<InvoicesComponent>;
  let component: InvoicesComponent;
  let params: BehaviorSubject<ParamMap>;
  let service: jasmine.SpyObj<InvoiceIndexService>;
  let errors: jasmine.SpyObj<ErrorPresentationService>;
  let navigate: jasmine.Spy;

  beforeEach(async () => {
    params = new BehaviorSubject(convertToParamMap({ cost_center_id: '3' }));
    service = jasmine.createSpyObj<InvoiceIndexService>('InvoiceIndexService', ['index']);
    service.index.and.returnValue(of({ items: [], total: 0, page: 0, page_size: 50 }));
    errors = jasmine.createSpyObj<ErrorPresentationService>('ErrorPresentationService', ['present']);
    await TestBed.configureTestingModule({
      imports: [InvoicesComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: params.asObservable() } },
        { provide: InvoiceIndexService, useValue: service },
        { provide: CostCenterService, useValue: { getAll: () => of([{ id: 3, label: 'Bibliothek' }]) } },
        { provide: CostTypeService, useValue: { getAll: () => of([]) } },
        { provide: ContractService, useValue: { getAll: () => of([]) } },
        { provide: ErrorPresentationService, useValue: errors },
        { provide: Clipboard, useValue: { copy: jasmine.createSpy('copy').and.returnValue(true) } },
        { provide: RuntimeConfigService, useValue: { getValue: () => 'https://example.org/output/' } },
        { provide: MatSnackBar, useValue: { open: jasmine.createSpy('open') } },
      ],
    }).compileComponents();
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(InvoicesComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => fixture.destroy());

  function renderInvoice(overrides: Partial<InvoiceIndex> = {}): HTMLElement {
    const invoice: InvoiceIndex = {
      id: 1, invoice_kind: InvoiceKind.INVOICE, number: null, date: null, booking_date: null, booking_amount: null, costs_eur: 0,
      net_amount_eur: null, vat_amount_eur: null, gross_amount_eur: null, item_count: 0, missing_amount_item_count: 0,
      publication_id: null, publication_title: null, publication_doi: null, publication_deleted: false,
      component_contract_id: null, component_contract_label: null, publication_contract_id: null, publication_contract_label: null,
      contract_component_id: null, contract_component_label: null, contract_conflict: false, context: 'unassigned',
      cost_center_id: null, cost_center_number: null, cost_center_label: null, cost_type_ids: [], cost_type_labels: [],
      ...overrides,
    };
    service.index.and.returnValue(of({ items: [invoice], total: 1, page: 0, page_size: 50 }));
    const host = fixture.nativeElement as HTMLElement;
    host.style.display = 'block';
    host.style.width = '1200px';
    fixture.detectChanges();
    return host;
  }

  for (const contractLabel of [null, 'Vertrag A']) {
    it(`allows the ${contractLabel ? 'short' : 'empty'} contract column and table to shrink to their contents`, () => {
      const host = renderInvoice({ component_contract_id: contractLabel ? 7 : null, component_contract_label: contractLabel });
      expect(host.querySelector('table')!.getBoundingClientRect().width).toBeGreaterThan(0);
      expect(host.querySelector('table')!.getBoundingClientRect().width).toBeLessThan(1500);
      expect(host.querySelector('td.mat-column-contract')!.getBoundingClientRect().width).toBeLessThan(200);
      expect(host.querySelector('td.mat-column-publication')!.getBoundingClientRect().width).toBeLessThan(200);
      expect(getComputedStyle(host.querySelector('th.mat-column-contract')!).whiteSpace).toBe('normal');
    });
  }

  it('wraps long reference labels without truncating or overflowing their cells', () => {
    const label = 'LangerVertragsnameOhneLeerzeichen'.repeat(10);
    const host = renderInvoice({ component_contract_id: 7, component_contract_label: label, publication_id: 9, publication_title: label });
    for (const column of ['contract', 'publication']) {
      const cell = host.querySelector<HTMLElement>(`td.mat-column-${column}`)!;
      expect(cell.clientWidth).toBeGreaterThan(0);
      expect(cell.textContent).toContain(label);
      expect(cell.scrollWidth).toBeLessThanOrEqual(cell.clientWidth + 1);
      expect(getComputedStyle(cell).overflowWrap).toBe('anywhere');
      expect(cell.querySelector('a')!.getClientRects().length).toBeGreaterThan(1);
    }
  });

  it('loads URL filters, shows their labels and follows subsequent URL changes', () => {
    fixture.detectChanges();
    expect(service.index).toHaveBeenCalledWith(jasmine.objectContaining({ cost_center_id: 3 }));
    expect(fixture.nativeElement.textContent).toContain('Kostenstelle: Bibliothek');
    params.next(convertToParamMap({ contract_id: '7', invoice_year: '2026' }));
    expect(service.index).toHaveBeenCalledWith(jasmine.objectContaining({ contract_id: 7, invoice_year: 2026 }));
    expect(component.form.get('cost_center_id').value).toBe('');
    expect(component.form.get('contract_id').value).toBe(7);
  });

  it('resets the page when applying, removing or clearing filters', () => {
    fixture.detectChanges();
    component.query.page = 4;
    component.form.patchValue({ booking_year: 2025, invoice_date_missing: false });
    component.applyFilters();
    expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: {
      cost_center_id: 3, booking_year: 2025, invoice_date_missing: false,
    } }));
    component.removeFilter('cost_center_id');
    expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: {} }));
    component.clearFilters();
    expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: {} }));
  });

  it('rejects reversed dates and invalid IDs before requesting a new list', () => {
    fixture.detectChanges();
    component.form.patchValue({ date_from: '2026-12-31', date_to: '2026-01-01', publication_id: -1 });
    component.applyFilters();
    expect(navigate).not.toHaveBeenCalled();
    expect(component.form.hasError('dateRange')).toBeTrue();
  });

  it('sends paging and sorting to the URL rather than paging the loaded rows', () => {
    fixture.detectChanges();
    component.pageChanged({ pageIndex: 2, pageSize: 25, length: 100 });
    expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: { page: 2, page_size: 25, cost_center_id: 3 } }));
    const header = fixture.nativeElement.querySelector('th.mat-column-booking_amount') as HTMLElement;
    expect(fixture.nativeElement.querySelector('th.mat-column-date .bottom.active')).toBeTruthy();
    header.querySelector<HTMLElement>('.mat-sort-header-container').click();
    expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: { sort: 'booking_amount', sort_dir: 'asc', cost_center_id: 3 } }));

    params.next(convertToParamMap({ sort: 'booking_amount', sort_dir: 'asc', cost_center_id: '3' }));
    fixture.detectChanges();
    expect(header.querySelector('.top.active')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('th.mat-column-date .bottom.active')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('th.mat-column-publication .numbered-sort-header')).toBeFalsy();
    header.querySelector<HTMLElement>('.mat-sort-header-container').click();
    expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: { sort: 'booking_amount', cost_center_id: 3 } }));
    params.next(convertToParamMap({ sort: 'booking_amount', cost_center_id: '3' }));
    fixture.detectChanges();
    expect(header.querySelector('.bottom.active')).toBeTruthy();
  });

  it('copies a shareable link while retaining the configured application path', () => {
    spyOnProperty(TestBed.inject(Router), 'url', 'get').and.returnValue('/invoices?contract_id=7&invoice_year=2026');
    component.copyLink();
    expect(TestBed.inject(Clipboard).copy).toHaveBeenCalledWith('https://example.org/output/invoices?contract_id=7&invoice_year=2026');
  });

  it('recovers from a failed load and cancels a stale request on URL change', () => {
    const stale = new Subject<{ items: InvoiceIndex[]; total: number; page: number; page_size: number }>();
    service.index.and.returnValues(stale, throwError(() => new Error('unavailable')), of({ items: [], total: 3, page: 0, page_size: 50 }));
    fixture.detectChanges();
    params.next(convertToParamMap({ contract_id: '7' }));
    expect(component.loadFailed).toBeTrue();
    expect(component.loading).toBeFalse();
    component.reload();
    stale.next({ items: [], total: 1000, page: 0, page_size: 50 });
    expect(component.result.total).toBe(3);
    expect(component.loadFailed).toBeFalse();
    expect(errors.present).toHaveBeenCalledTimes(1);
  });

  it('renders zero, missing amounts, context links and incomplete invoice notices', () => {
    service.index.and.returnValue(of({ items: [{
      id: 1, invoice_kind: 'pre_invoice', number: null, date: null, booking_date: null, booking_amount: 0, costs_eur: 0,
      net_amount_eur: null, vat_amount_eur: null, gross_amount_eur: null, item_count: 2, missing_amount_item_count: 1,
      publication_id: 9, publication_title: 'Testpublikation', publication_doi: null, publication_deleted: false,
      component_contract_id: 7, component_contract_label: 'Vertrag A', publication_contract_id: 8, publication_contract_label: 'Vertrag B',
      contract_component_id: 11, contract_component_label: 'Komponente', contract_conflict: true, context: 'both',
      cost_center_id: null, cost_center_number: null, cost_center_label: null, cost_type_ids: [], cost_type_labels: [],
    } as InvoiceIndex], total: 1, page: 0, page_size: 50 }));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Vorabrechnung');
    expect(text).toContain('0,00');
    expect(fixture.nativeElement.querySelector('td.mat-column-costs_eur').textContent).toContain('0,00');
    expect(text).toContain('Vertrag A');
    expect(text).toContain('Vertrag B');
    expect(fixture.nativeElement.querySelector('a[href="/publications?id=9"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.issue-icon').getAttribute('aria-label')).toContain('Abweichende Verträge');
    expect(component.formatMoney(null)).toBe('–');
  });
});
