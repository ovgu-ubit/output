import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Validators } from '@angular/forms';
import { of, tap } from 'rxjs';
import { ContractComponent, ContractModel } from '../../../../../output-interfaces/Publication';
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

@Component({
    selector: 'app-contract-component-form',
    templateUrl: './contract-component-form.component.html',
    styleUrls: ['./contract-component-form.component.css'],
    standalone: false
})
export class ContractComponentFormComponent extends AbstractFormComponent<ContractComponent> {

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

  constructor(
    public override dialogRef: MatDialogRef<ContractComponentFormComponent>,
    @Inject(MAT_DIALOG_DATA) public override data: any,
  ) {
    super();
  }

  override ngOnInit(): void {
    this.postProcessing = of(null).pipe(tap(() => {
      this.patchContractModelParams();
      this.updateModelValidators(this.selectedModel);
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
    });

    this.form.get('contract_model')?.valueChanges.subscribe(model => {
      this.updateModelValidators(model);
    });
  }

  get selectedModel(): ContractModel | null {
    return this.form?.get('contract_model')?.value ?? null;
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

    percentage?.clearValidators();
    parFee?.clearValidators();
    serviceFee?.clearValidators();
    limitType?.clearValidators();
    distributionFormula?.clearValidators();

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
}

