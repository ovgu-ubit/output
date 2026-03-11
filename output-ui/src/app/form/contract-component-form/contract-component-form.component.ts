import { Component, Inject, inject } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Observable, forkJoin, map, of, startWith, tap } from 'rxjs';
import { ContractComponent, ContractModel, GreaterEntity, OA_Category, PublicationType } from '../../../../../output-interfaces/Publication';
import { GreaterEntityService } from '../../services/entities/greater-entity.service';
import { OACategoryService } from '../../services/entities/oa-category.service';
import { PublicationTypeService } from '../../services/entities/publication-type.service';
import { AbstractFormComponent } from '../abstract-form/abstract-form.component';

interface DiscountContractModelParams {
  percentage?: number;
  service_fee?: number;
}

interface PublishAndReadContractModelParams {
  par_fee?: number;
  service_fee?: number;
}

interface FlatrateContractModelParams {
  limit_type?: 'count' | 'budget';
  distribution_formula?: 'average' | 'list-price-porportional' | 'first_come_first_serve';
  service_fee?: number;
}

type ContractComponentRelationKey = 'oa_categories' | 'pub_types' | 'greater_entities';

interface SelectableContractComponentEntity {
  id?: number;
  label?: string;
  identifiers?: { value?: string }[];
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

  override name = 'Vertragskomponente';
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

  oaCategoryInput = new FormControl('', { nonNullable: true });
  publicationTypeInput = new FormControl('', { nonNullable: true });
  greaterEntityInput = new FormControl('', { nonNullable: true });

  oaCategories: OA_Category[] = [];
  publicationTypes: PublicationType[] = [];
  greaterEntities: GreaterEntity[] = [];

  filteredOACategories$: Observable<OA_Category[]> = of([]);
  filteredPublicationTypes$: Observable<PublicationType[]> = of([]);
  filteredGreaterEntities$: Observable<GreaterEntity[]> = of([]);

  constructor(
    public override dialogRef: MatDialogRef<ContractComponentFormComponent>,
    @Inject(MAT_DIALOG_DATA) public override data: any,
  ) {
    super();
  }

  override ngOnInit(): void {
    this.postProcessing = of(null).pipe(tap(() => {
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

  override disable() {
    super.disable();
    this.disableRelationInputs();
  }

  override async action() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const rawValue = this.form.getRawValue();
    const contractModelParams = this.buildContractModelParams(rawValue.contract_model);
    const entity: any = {
      ...this.entity,
      ...rawValue,
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

  private patchContractModelParams() {
    const params = this.entity?.contract_model_params as DiscountContractModelParams & PublishAndReadContractModelParams & FlatrateContractModelParams;
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
  }

  private buildContractModelParams(model: ContractModel | null) {
    if (model === ContractModel.DISCOUNT) {
      return {
        percentage: this.toNumber(this.form.get('percentage')?.value),
        service_fee: this.toNumber(this.form.get('service_fee')?.value),
      };
    }

    if (model === ContractModel.PUBLISH_AND_READ) {
      return {
        par_fee: this.toNumber(this.form.get('par_fee')?.value),
        service_fee: this.toNumber(this.form.get('service_fee')?.value),
      };
    }

    if (model === ContractModel.FLATRATE) {
      return {
        limit_type: this.form.get('limit_type')?.value || null,
        distribution_formula: this.form.get('distribution_formula')?.value || null,
        service_fee: this.toNumber(this.form.get('service_fee')?.value),
      };
    }

    return null;
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
}

