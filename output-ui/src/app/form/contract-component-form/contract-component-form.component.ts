import { Component, Inject, ViewChild, inject } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { Observable, forkJoin, map, of, startWith, tap } from 'rxjs';
import {  ContractComponent, ContractModel, GreaterEntity, Invoice, OA_Category, PublicationType  } from '@output/interfaces';
import { GreaterEntityService } from '../../services/entities/greater-entity.service';
import { OACategoryService } from '../../services/entities/oa-category.service';
import { PublicationTypeService } from '../../services/entities/publication-type.service';
import { AbstractFormComponent } from '../abstract-form/abstract-form.component';
import { InvoiceFormComponent } from '../invoice-form/invoice-form.component';
import * as XLSX from 'xlsx';

type ContractComponentRelationKey = 'oa_categories' | 'pub_types' | 'greater_entities';
type InvoiceCollectionKey = 'invoices' | 'pre_invoices';

interface SelectableContractComponentEntity {
  id?: number;
  label?: string;
  identifiers?: { value?: string }[];
}

interface JournalPriceEntry {
  issn?: string;
  title?: string;
  greater_entity_id?: number;
  price: number;
}

interface ExcelColumn {
  index: number;
  label: string;
}

@Component({
    selector: 'app-contract-component-form',
    templateUrl: './contract-component-form.component.html',
    styleUrls: ['./contract-component-form.component.css'],
    standalone: false
})
export class ContractComponentFormComponent extends AbstractFormComponent<ContractComponent> {
  private readonly oaCategoryService = inject(OACategoryService);
  private readonly publicationTypeService = inject(PublicationTypeService);
  private readonly greaterEntityService = inject(GreaterEntityService);
  private readonly invoiceDialog = inject(MatDialog);

  @ViewChild('tableInvoice') tableInvoice?: MatTable<Invoice>;
  @ViewChild('tablePreInvoice') tablePreInvoice?: MatTable<Invoice>;

  override name = 'Vertragskomponente';
  displayedInvoiceColumns: string[] = ['date', 'number', 'costs', 'edit', 'delete'];
  invoiceCollectionsAvailable = true;
  contractModel = ContractModel;
  contractModels = [
    { value: ContractModel.DISCOUNT, label: 'Rabatt' },
    { value: ContractModel.PUBLISH_AND_READ, label: 'Publish & Read' },
    { value: ContractModel.FLATRATE, label: 'Flatrate' },
  ];
  limitTypes = [
    { value: 'count', label: 'Nach Anzahl' },
    { value: 'budget', label: 'Nach Budget' },
  ];
  distributionFormulas = [
    { value: 'average', label: 'Gleichmäßig' },
    { value: 'list-price-porportional', label: 'Proportional zum Listenpreis' },
    { value: 'first_come_first_serve', label: 'Nur bis Limit erreicht' },
  ];

  override fields = [];

  oaCategoryInput = new FormControl('', { nonNullable: true });
  publicationTypeInput = new FormControl('', { nonNullable: true });
  greaterEntityInput = new FormControl('', { nonNullable: true });

  oaCategories: OA_Category[] = [];
  publicationTypes: PublicationType[] = [];
  greaterEntities: GreaterEntity[] = [];

  filteredOACategories$: Observable<OA_Category[]> = of([]);
  filteredPublicationTypes$: Observable<PublicationType[]> = of([]);
  filteredGreaterEntities$: Observable<GreaterEntity[]> = of([]);

  journalPrices: JournalPriceEntry[] = [];
  journalSearchQuery: string = '';
  excelFile: File | null = null;
  excelHeaders: string[] = [];
  excelColumns: ExcelColumn[] = [];
  issnColumnIndex: number | null = null;
  titleColumnIndex: number | null = null;
  priceColumnIndex: number | null = null;
  excelRowsToSkip = 0;
  excelRows: any[][] = [];
  excelParsedData: any[][] = [];
  mappingError: string = '';

  constructor(
    public override dialogRef: MatDialogRef<ContractComponentFormComponent>,
    @Inject(MAT_DIALOG_DATA) public override data: any,
  ) {
    super();
  }

  override ngOnInit(): void {
    this.postProcessing = of(null).pipe(tap(() => {
      this.invoiceCollectionsAvailable = !this.disabled || this.hasProvidedInvoiceCollections();
      if (this.invoiceCollectionsAvailable) {
        this.ensureInvoiceCollections();
      }
      this.patchContractModelParams();
      this.setRelationControlValue('oa_categories', this.entity?.oa_categories ?? []);
      this.setRelationControlValue('pub_types', this.entity?.pub_types ?? []);
      this.setRelationControlValue('greater_entities', this.entity?.greater_entities ?? []);
      this.updateModelValidators(this.selectedModel);
      this.setupRelationFilters();
      if (this.disabled) {
        this.disableRelationInputs();
      }
    }));

    this.form = this.formBuilder.group({
      id: [''],
      label: ['', Validators.required],
      contract_model: [null],
      contract_model_version: [1],
      percentage: [''],
      par_fee: [''],
      service_fee: [''],
      limit_type: [''],
      distribution_formula: [''],
      oa_categories: [[] as OA_Category[]],
      pub_types: [[] as PublicationType[]],
      greater_entities: [[] as GreaterEntity[]],
    });

    this.form.get('contract_model')?.valueChanges.subscribe(model => {
      this.updateModelValidators(model);
    });

    this.loadRelationOptions();
    this.setupRelationFilters();
  }

  get selectedModel(): ContractModel | null {
    return this.form?.get('contract_model')?.value ?? null;
  }

  get selectedOACategories(): OA_Category[] {
    return this.form?.get('oa_categories')?.value ?? [];
  }

  get selectedPublicationTypes(): PublicationType[] {
    return this.form?.get('pub_types')?.value ?? [];
  }

  get selectedGreaterEntities(): GreaterEntity[] {
    return this.form?.get('greater_entities')?.value ?? [];
  }

  get invoices(): Invoice[] {
    return this.entity?.invoices ?? [];
  }

  get preInvoices(): Invoice[] {
    return this.entity?.pre_invoices ?? [];
  }

  override disable() {
    super.disable();
    this.disableRelationInputs();
  }

  override async action() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.ensureInvoiceCollections();

    const rawValue = this.form.getRawValue();
    const contractModelParams = this.buildContractModelParams(rawValue.contract_model);
    const entity: any = {
      ...this.entity,
      ...rawValue,
      invoices: this.entity?.invoices ?? [],
      pre_invoices: this.entity?.pre_invoices ?? [],
      contract_model_params: contractModelParams,
    };

    delete entity.percentage;
    delete entity.par_fee;
    delete entity.service_fee;
    delete entity.limit_type;
    delete entity.distribution_formula;

    if (!entity.id) entity.id = undefined;
    if (!entity.contract_model_version) entity.contract_model_version = 1;
    if (entity.contract_model === null || entity.contract_model === undefined || entity.contract_model === '') {
      entity.contract_model = undefined;
      entity.contract_model_params = null;
    }

    this.dialogRef.close({ ...entity, updated: true });
  }

  addOACategory(event: MatAutocompleteSelectedEvent) {
    this.addRelationSelection('oa_categories', this.oaCategories, this.oaCategoryInput, event);
  }

  addPublicationType(event: MatAutocompleteSelectedEvent) {
    this.addRelationSelection('pub_types', this.publicationTypes, this.publicationTypeInput, event);
  }

  addGreaterEntity(event: MatAutocompleteSelectedEvent) {
    this.addRelationSelection('greater_entities', this.greaterEntities, this.greaterEntityInput, event);
  }

  removeOACategory(category: OA_Category) {
    this.removeRelationSelection('oa_categories', category);
  }

  removePublicationType(publicationType: PublicationType) {
    this.removeRelationSelection('pub_types', publicationType);
  }

  removeGreaterEntity(greaterEntity: GreaterEntity) {
    this.removeRelationSelection('greater_entities', greaterEntity);
  }

  addInvoice(invoice?: Invoice) {
    this.openInvoiceDialog('invoices', invoice);
  }

  addPreInvoice(invoice?: Invoice) {
    this.openInvoiceDialog('pre_invoices', invoice);
  }

  deleteInvoice(invoice: Invoice) {
    this.removeInvoice('invoices', invoice);
  }

  deletePreInvoice(invoice: Invoice) {
    this.removeInvoice('pre_invoices', invoice);
  }

  getInvoiceCosts(invoice: Invoice) {
    if (!invoice) {
      return '';
    }
    if (invoice.booking_amount !== null && invoice.booking_amount !== undefined) {
      return invoice.booking_amount;
    }
    if (!invoice.cost_items) {
      return '';
    }

    let sum = 0;
    for (const costItem of invoice.cost_items) {
      sum += costItem.euro_value;
    }
    return sum;
  }

  private patchContractModelParams() {
    const params = this.entity?.contract_model_params as any;
    if (!params) {
      return;
    }

    this.form.patchValue({
      percentage: params.percentage ?? '',
      par_fee: params.par_fee ?? '',
      service_fee: params.service_fee ?? '',
      limit_type: params.limit_type ?? '',
      distribution_formula: params.distribution_formula ?? '',
    }, { emitEvent: false });

    this.journalPrices = params.journal_prices ?? [];
  }

  private buildContractModelParams(model: ContractModel | null) {
    let baseParams: any = null;

    if (model === ContractModel.DISCOUNT) {
      baseParams = {
        percentage: this.toNumber(this.form.get('percentage')?.value),
        service_fee: this.toNumber(this.form.get('service_fee')?.value),
      };
    } else if (model === ContractModel.PUBLISH_AND_READ) {
      baseParams = {
        par_fee: this.toNumber(this.form.get('par_fee')?.value),
        service_fee: this.toNumber(this.form.get('service_fee')?.value),
      };
    } else if (model === ContractModel.FLATRATE) {
      baseParams = {
        limit_type: this.form.get('limit_type')?.value || null,
        distribution_formula: this.form.get('distribution_formula')?.value || null,
        service_fee: this.toNumber(this.form.get('service_fee')?.value),
      };
    }

    if (baseParams && this.journalPrices.length > 0) {
      baseParams.journal_prices = this.journalPrices;
    }

    return baseParams;
  }

  onJournalSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.journalSearchQuery = input.value.trim().toLowerCase();
  }

  get filteredJournalPrices() {
    if (!this.journalSearchQuery) {
      return this.journalPrices;
    }
    return this.journalPrices.filter(entry => 
      (entry.issn && entry.issn.toLowerCase().includes(this.journalSearchQuery)) ||
      (entry.title && entry.title.toLowerCase().includes(this.journalSearchQuery)) ||
      (entry.greater_entity_id && entry.greater_entity_id.toString().includes(this.journalSearchQuery))
    );
  }

  onExcelFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.excelFile = file;
    this.mappingError = '';
    this.excelHeaders = [];
    this.excelColumns = [];
    this.excelParsedData = [];
    this.excelRows = [];
    this.issnColumnIndex = null;
    this.titleColumnIndex = null;
    this.priceColumnIndex = null;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
        
        if (jsonData.length > 0) {
          this.excelRows = jsonData;
          this.updateExcelColumnsFromSkipRows();
        } else {
          this.mappingError = 'Die Datei scheint leer zu sein.';
        }
      } catch (err) {
        console.error(err);
        this.mappingError = 'Fehler beim Lesen der Excel-Datei. Bitte überprüfen Sie das Format.';
      }
    };
    reader.readAsArrayBuffer(file);
  }

  onExcelRowsToSkipChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.excelRowsToSkip = Math.max(0, Math.floor(Number(input.value) || 0));
    this.updateExcelColumnsFromSkipRows();
  }

  validateMapping() {
    this.mappingError = '';
  }

  applyExcelMapping() {
    if (this.issnColumnIndex === null || this.priceColumnIndex === null || this.excelColumns.length === 0) {
      this.mappingError = 'Bitte wählen Sie sowohl die ISSN- als auch die Preis-Spalte aus.';
      return;
    }

    const issnIdx = this.issnColumnIndex;
    const titleIdx = this.titleColumnIndex;
    const priceIdx = this.priceColumnIndex;

    if (issnIdx === -1 || priceIdx === -1) {
      this.mappingError = 'Ausgewählte Spalten wurden in der Datei nicht gefunden.';
      return;
    }

    const newPrices: JournalPriceEntry[] = [];
    let errorCount = 0;

    for (const row of this.excelParsedData) {
      const rawIssn = row[issnIdx]?.toString().trim();
      const rawTitle = titleIdx === null ? '' : row[titleIdx]?.toString().trim();
      const rawPrice = row[priceIdx];

      if (!rawIssn) continue;

      let cleanPriceStr = rawPrice?.toString()
        .replace(/[^0-9.,-]/g, '')
        .replace(/,/g, '.');

      const dotIndex = cleanPriceStr?.lastIndexOf('.');
      if (dotIndex !== -1) {
        const parts = cleanPriceStr?.split('.');
        const lastPart = parts?.pop() || '';
        const firstPart = parts?.join('');
        cleanPriceStr = `${firstPart}.${lastPart}`;
      }

      const price = parseFloat(cleanPriceStr);

      if (isNaN(price) || price < 0) {
        errorCount++;
        continue;
      }

      newPrices.push({
        issn: rawIssn,
        ...(rawTitle ? { title: rawTitle } : {}),
        price
      });
    }

    if (newPrices.length === 0) {
      this.mappingError = 'Es konnten keine gültigen ISSN/Preis-Kombinationen importiert werden. Bitte überprüfen Sie die Spaltenauswahl.';
      return;
    }

    const priceMap = new Map<string, JournalPriceEntry>();
    
    for (const entry of this.journalPrices) {
      if (entry.issn) {
        priceMap.set(entry.issn, entry);
      } else if (entry.greater_entity_id) {
        priceMap.set(`id:${entry.greater_entity_id}`, entry);
      }
    }

    for (const newEntry of newPrices) {
      const existing = priceMap.get(newEntry.issn);
      if (existing) {
        existing.price = newEntry.price;
        existing.title = newEntry.title ?? existing.title;
      } else {
        priceMap.set(newEntry.issn, newEntry);
      }
    }

    this.journalPrices = Array.from(priceMap.values());
    this.excelFile = null;
    this.excelHeaders = [];
    this.excelColumns = [];
    this.excelParsedData = [];
    this.excelRows = [];
    this.issnColumnIndex = null;
    this.titleColumnIndex = null;
    this.priceColumnIndex = null;

    let successMsg = `${newPrices.length} Preise erfolgreich importiert.`;
    if (errorCount > 0) {
      successMsg += ` (${errorCount} Zeilen konnten wegen fehlerhafter Preiswerte nicht importiert werden.)`;
    }
    this.mappingError = successMsg;
  }

  removeJournalPrice(entry: any) {
    this.journalPrices = this.journalPrices.filter(e => e !== entry);
  }

  private updateExcelColumnsFromSkipRows() {
    this.mappingError = '';
    this.excelHeaders = [];
    this.excelColumns = [];
    this.excelParsedData = [];
    this.issnColumnIndex = null;
    this.titleColumnIndex = null;
    this.priceColumnIndex = null;

    if (this.excelRows.length === 0) {
      return;
    }

    if (this.excelRowsToSkip >= this.excelRows.length) {
      this.mappingError = 'Die Anzahl der zu ueberspringenden Zeilen ist groesser als die Anzahl der Zeilen in der Datei.';
      return;
    }

    const headerRow = this.excelRows[this.excelRowsToSkip] ?? [];
    this.excelHeaders = headerRow.map((header: any) => header?.toString().trim() ?? '');
    this.excelColumns = this.excelHeaders.map((label, index) => ({ index, label }));
    this.excelParsedData = this.excelRows.slice(this.excelRowsToSkip + 1);

    const lowerHeaders = this.excelHeaders.map(header => header.toLowerCase());
    this.issnColumnIndex = this.findColumnIndex(lowerHeaders, ['issn']);
    this.titleColumnIndex = this.findColumnIndex(lowerHeaders, ['titel', 'title', 'journal', 'zeitschrift', 'name']);
    this.priceColumnIndex = this.findColumnIndex(lowerHeaders, ['price', 'preis', 'apc', 'fee', 'gebuehr', 'gebühr', 'wert']);
  }

  private findColumnIndex(headers: string[], terms: string[]): number | null {
    const index = headers.findIndex(header => terms.some(term => header.includes(term)));
    return index === -1 ? null : index;
  }

  private updateModelValidators(model: ContractModel | null) {
    const percentage = this.form.get('percentage');
    const parFee = this.form.get('par_fee');
    const serviceFee = this.form.get('service_fee');
    const limitType = this.form.get('limit_type');
    const distributionFormula = this.form.get('distribution_formula');
    const version = this.form.get('contract_model_version');

    percentage?.clearValidators();
    parFee?.clearValidators();
    serviceFee?.clearValidators();
    limitType?.clearValidators();
    distributionFormula?.clearValidators();

    version?.setValue(1);
    version?.disable();

    if (model === ContractModel.DISCOUNT) {
      percentage?.setValidators([Validators.required]);
      serviceFee?.setValidators([Validators.required]);
    }

    if (model === ContractModel.PUBLISH_AND_READ) {
      parFee?.setValidators([Validators.required]);
      serviceFee?.setValidators([Validators.required]);
    }

    if (model === ContractModel.FLATRATE) {
      limitType?.setValidators([Validators.required]);
      distributionFormula?.setValidators([Validators.required]);
      serviceFee?.setValidators([Validators.required]);
    }

    percentage?.updateValueAndValidity({ emitEvent: false });
    parFee?.updateValueAndValidity({ emitEvent: false });
    serviceFee?.updateValueAndValidity({ emitEvent: false });
    limitType?.updateValueAndValidity({ emitEvent: false });
    distributionFormula?.updateValueAndValidity({ emitEvent: false });
  }

  private toNumber(value: unknown): number | null {
    if (value === '' || value === null || value === undefined) {
      return null;
    }

    return Number(value);
  }

  private loadRelationOptions() {
    forkJoin({
      oaCategories: this.oaCategoryService.getAll(),
      publicationTypes: this.publicationTypeService.getAll(),
      greaterEntities: this.greaterEntityService.getAll(),
    }).subscribe(({ oaCategories, publicationTypes, greaterEntities }) => {
      this.oaCategories = this.sortByLabel(oaCategories);
      this.publicationTypes = this.sortByLabel(publicationTypes);
      this.greaterEntities = this.sortByLabel(greaterEntities);
      this.setupRelationFilters();
    });
  }

  private setupRelationFilters() {
    this.filteredOACategories$ = this.createFilteredOptions(
      this.oaCategoryInput,
      () => this.oaCategories,
      () => this.selectedOACategories,
    );
    this.filteredPublicationTypes$ = this.createFilteredOptions(
      this.publicationTypeInput,
      () => this.publicationTypes,
      () => this.selectedPublicationTypes,
    );
    this.filteredGreaterEntities$ = this.createFilteredOptions(
      this.greaterEntityInput,
      () => this.greaterEntities,
      () => this.selectedGreaterEntities,
    );
  }

  private disableRelationInputs() {
    this.oaCategoryInput.disable({ emitEvent: false });
    this.publicationTypeInput.disable({ emitEvent: false });
    this.greaterEntityInput.disable({ emitEvent: false });
  }

  private setRelationControlValue<T>(controlName: ContractComponentRelationKey, value: T[]) {
    this.form.get(controlName)?.setValue([...(value ?? [])], { emitEvent: false });
  }

  private addRelationSelection<T extends SelectableContractComponentEntity>(
    controlName: ContractComponentRelationKey,
    options: T[],
    inputControl: FormControl<string>,
    event: MatAutocompleteSelectedEvent,
  ) {
    const selectedValue = `${event.option.value ?? ''}`.trim().toLowerCase();
    const option = options.find(candidate => candidate.label?.trim().toLowerCase() === selectedValue);
    inputControl.setValue('');

    if (!option) {
      return;
    }

    const current = this.getRelationSelections<T>(controlName);
    if (current.some(candidate => this.isSameEntity(candidate, option))) {
      return;
    }

    this.form.get(controlName)?.setValue([...current, option]);
    this.form.markAsDirty();
  }

  private removeRelationSelection<T extends SelectableContractComponentEntity>(
    controlName: ContractComponentRelationKey,
    option: T,
  ) {
    const next = this.getRelationSelections<T>(controlName)
      .filter(candidate => !this.isSameEntity(candidate, option));
    this.form.get(controlName)?.setValue(next);
    this.form.markAsDirty();
  }

  private getRelationSelections<T>(controlName: ContractComponentRelationKey): T[] {
    return (this.form.get(controlName)?.value ?? []) as T[];
  }

  private createFilteredOptions<T extends SelectableContractComponentEntity>(
    inputControl: FormControl<string>,
    options: () => T[],
    selected: () => T[],
  ): Observable<T[]> {
    return inputControl.valueChanges.pipe(
      startWith(inputControl.value),
      map(value => this.filterOptions(options(), selected(), value ?? '')),
    );
  }

  private filterOptions<T extends SelectableContractComponentEntity>(
    options: T[],
    selected: T[],
    searchTerm: string,
  ): T[] {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return options.filter(option => {
      if (selected.some(selectedOption => this.isSameEntity(selectedOption, option))) {
        return false;
      }

      if (!normalizedSearchTerm) {
        return true;
      }

      const labelMatches = option.label?.toLowerCase().includes(normalizedSearchTerm);
      const identifierMatches = option.identifiers?.some(identifier =>
        identifier.value?.toLowerCase().includes(normalizedSearchTerm),
      );

      return Boolean(labelMatches || identifierMatches);
    });
  }

  private isSameEntity(
    left: SelectableContractComponentEntity,
    right: SelectableContractComponentEntity,
  ): boolean {
    if (left.id !== undefined && right.id !== undefined) {
      return left.id === right.id;
    }

    return (left.label ?? '').trim().toLowerCase() === (right.label ?? '').trim().toLowerCase();
  }

  private sortByLabel<T extends SelectableContractComponentEntity>(options: T[]): T[] {
    return [...options].sort((left, right) =>
      (left.label ?? '').localeCompare(right.label ?? '', 'de'),
    );
  }

  private ensureInvoiceCollections() {
    if (!this.entity) {
      this.entity = {} as ContractComponent;
    }
    if (!this.entity.invoices) {
      this.entity.invoices = [];
    }
    if (!this.entity.pre_invoices) {
      this.entity.pre_invoices = [];
    }
  }

  private hasProvidedInvoiceCollections(): boolean {
    return Array.isArray(this.entity?.invoices) || Array.isArray(this.entity?.pre_invoices);
  }

  private openInvoiceDialog(collection: InvoiceCollectionKey, invoice?: Invoice) {
    this.ensureInvoiceCollections();

    const invoices = this.getInvoiceCollection(collection);
    const dialogRef = this.invoiceDialog.open(InvoiceFormComponent, {
      width: '800px',
      data: {
        entity: invoice,
        locked: this.disabled,
      },
      disableClose: true
    });

    if (invoice && !invoice.id) {
      this.setInvoiceCollection(collection, invoices.filter(current => current !== invoice));
    }

    dialogRef.afterClosed().subscribe({
      next: data => {
        if (data && data.updated) {
          const currentInvoices = this.getInvoiceCollection(collection);
          const nextInvoices = invoice?.id
            ? currentInvoices.filter(current => current.id !== data.id)
            : currentInvoices;
          this.setInvoiceCollection(collection, [...nextInvoices, data]);
          this.form.markAsDirty();
          this.updateInvoiceTableData(collection);
        } else if (invoice && !invoice.id) {
          this.setInvoiceCollection(collection, [...this.getInvoiceCollection(collection), invoice]);
          this.updateInvoiceTableData(collection);
        }
      }
    });
  }

  private removeInvoice(collection: InvoiceCollectionKey, invoice: Invoice) {
    if (this.disabled) {
      return;
    }

    const nextInvoices = invoice.id
      ? this.getInvoiceCollection(collection).filter(current => current.id !== invoice.id)
      : this.getInvoiceCollection(collection).filter(current => current !== invoice);

    this.setInvoiceCollection(collection, nextInvoices);
    this.form.markAsDirty();
    this.updateInvoiceTableData(collection);
  }

  private getInvoiceCollection(collection: InvoiceCollectionKey): Invoice[] {
    this.ensureInvoiceCollections();
    return this.entity?.[collection] ?? [];
  }

  private setInvoiceCollection(collection: InvoiceCollectionKey, invoices: Invoice[]) {
    this.ensureInvoiceCollections();
    this.entity[collection] = invoices;
  }

  private updateInvoiceTableData(collection: InvoiceCollectionKey) {
    const table = collection === 'invoices' ? this.tableInvoice : this.tablePreInvoice;
    if (table) {
      table.dataSource = new MatTableDataSource<Invoice>(this.getInvoiceCollection(collection));
    }
  }
}
