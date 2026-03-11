import { Component, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Contract, ContractComponent, ContractModel } from '../../../../../output-interfaces/Publication';
import { ContractService } from 'src/app/services/entities/contract.service';
import { AbstractFormComponent } from '../abstract-form/abstract-form.component';
import { ContractComponentFormComponent } from '../contract-component-form/contract-component-form.component';

@Component({
    selector: 'app-contract-form',
    templateUrl: './contract-form.component.html',
    styleUrls: ['./contract-form.component.css'],
    standalone: false
})
export class ContractFormComponent {

  @ViewChild(AbstractFormComponent) abstractForm: AbstractFormComponent<Contract>;
  
  name = 'Vertrag';
  displayedColumns: string[] = ['label', 'contract_model', 'contract_model_version', 'contract_model_params', 'edit', 'delete'];
  fields = [
    { key: 'id', title: 'ID', type: 'number' },
    { key: 'label', title: 'Bezeichnung', required: true },
    { key: 'publ', title: 'Verlag', type: 'publisher' },
    { key: 'start_date', title: 'Startdatum', type: 'date' },
    { key: 'end_date', title: 'Enddatum', type: 'date' },
    { key: 'internal_number', title: 'Interne Nummer' },
    { key: 'invoice_amount', title: 'Rechnungsbetrag', type: 'number' },
    { key: 'invoice_information', title: 'Rechnungsinformationen', type: 'text' },
    { key: 'sec_pub', title: 'Zweitveröffentlichungsoption', type: 'text' },
    { key: 'gold_option', title: 'Gold-Option', type: 'text' },
    { key: 'verification_method', title: 'Verifikationsmethode', type: 'text' },
    { key: 'identifier', title: 'Identifikatoren', type: 'id_table' },
  ];

  constructor(
    public dialogRef: MatDialogRef<ContractFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public service: ContractService,
    private dialog: MatDialog,
  ) { }

  get hideAddComponentButton(): boolean {
    return !!this.abstractForm?.disabled;
  }

  get components(): ContractComponent[] {
    return this.abstractForm?.entity?.components ?? [];
  }

  openComponentForm(component?: ContractComponent) {
    if (!this.abstractForm?.entity) {
      return;
    }

    const components = this.components;
    const index = component ? components.indexOf(component) : -1;
    const dialogRef = this.dialog.open(ContractComponentFormComponent, {
      width: '800px',
      maxHeight: '800px',
      disableClose: true,
      data: {
        entity: component ? this.cloneComponent(component) : {},
        locked: this.abstractForm.disabled,
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result?.updated) {
        return;
      }

      const nextComponents = [...components];
      if (index > -1) {
        nextComponents[index] = result;
      } else {
        nextComponents.push(result);
      }

      this.abstractForm.entity = {
        ...this.abstractForm.entity,
        components: nextComponents,
      };
      this.abstractForm.form.markAsDirty();
    });
  }

  deleteComponent(component: ContractComponent) {
    if (this.abstractForm?.disabled || !this.abstractForm?.entity) {
      return;
    }

    this.abstractForm.entity = {
      ...this.abstractForm.entity,
      components: this.components.filter(current => current !== component),
    };
    this.abstractForm.form.markAsDirty();
  }

  formatContractModel(model?: ContractModel) {
    if (model === ContractModel.DISCOUNT) return 'DISCOUNT';
    if (model === ContractModel.PUBLISH_AND_READ) return 'PUBLISH_AND_READ';
    if (model === ContractModel.FLATRATE) return 'FLATRATE';
    return '-';
  }

  formatContractModelParams(component: ContractComponent) {
    const params = component?.contract_model_params as any;
    if (!params) {
      return '-';
    }

    if (component.contract_model === ContractModel.DISCOUNT) {
      return `Rabatt in %: ${params.percentage ?? '-'}, Servicegebühr: ${params.service_fee ?? '-'}`;
    }

    if (component.contract_model === ContractModel.PUBLISH_AND_READ) {
      return `PAR-Gebühr: ${params.par_fee ?? '-'}, Servicegebühr: ${params.service_fee ?? '-'}`;
    }

    if (component.contract_model === ContractModel.FLATRATE) {
      return `Limit-Typ: ${params.limit_type ?? '-'}, Verteilungsformel: ${params.distribution_formula ?? '-'}, Servicegebühr: ${params.service_fee ?? '-'}`;
    }

    return JSON.stringify(params);
  }

  private cloneComponent(component: ContractComponent): ContractComponent {
    return {
      ...component,
      contract_model_params: component.contract_model_params
        ? { ...(component.contract_model_params as Record<string, unknown>) }
        : null,
      oa_categories: component.oa_categories ? [...component.oa_categories] : [],
      pub_types: component.pub_types ? [...component.pub_types] : [],
      greater_entities: component.greater_entities ? [...component.greater_entities] : [],
      cost_types: component.cost_types ? [...component.cost_types] : [],
      invoices: component.invoices ? [...component.invoices] : [],
      pre_invoices: component.pre_invoices ? [...component.pre_invoices] : [],
    };
  }
}


