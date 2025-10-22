import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { AuthorFormComponent } from './author-form/author-form.component';
import { AuthorshipFormComponent } from './authorship-form/authorship-form.component';
import { ContractFormComponent } from './contract-form/contract-form.component';
import { CostCenterFormComponent } from './cost-center-form/cost-center-form.component';
import { CostItemFormComponent } from './cost-item-form/cost-item-form.component';
import { CostTypeFormComponent } from './cost-type-form/cost-type-form.component';
import { DoiFormComponent } from './doi-form/doi-form.component';
import { FunderFormComponent } from './funder-form/funder-form.component';
import { GreaterEntityFormComponent } from './greater-entity-form/greater-entity-form.component';
import { InstituteFormComponent } from './institute-form/institute-form.component';
import { InvoiceFormComponent } from './invoice-form/invoice-form.component';
import { OaCategoryFormComponent } from './oa-category-form/oa-category-form.component';
import { PubTypeFormComponent } from './pub-type-form/pub-type-form.component';
import { PublisherFormComponent } from './publisher-form/publisher-form.component';
import { RoleFormComponent } from './role-form/role-form.component';
import { StatusFormComponent } from './status-form/status-form.component';
import { AbstractFormComponent } from './abstract-form/abstract-form.component';

@NgModule({
  declarations: [
    AbstractFormComponent,
    AuthorFormComponent,
    AuthorshipFormComponent,
    ContractFormComponent,
    CostCenterFormComponent,
    CostItemFormComponent,
    CostTypeFormComponent,
    DoiFormComponent,
    FunderFormComponent,
    GreaterEntityFormComponent,
    InstituteFormComponent,
    InvoiceFormComponent,
    OaCategoryFormComponent,
    PubTypeFormComponent,
    PublisherFormComponent,
    RoleFormComponent,
    StatusFormComponent,
  ],
  imports: [
    SharedModule
  ],
})
export class FormModule {}
