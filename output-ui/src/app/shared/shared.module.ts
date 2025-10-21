import { CommonModule } from '@angular/common';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { HighchartsChartModule } from 'highcharts-angular';
import { AbstractFormComponent } from '../pages/windows/abstract-form/abstract-form.component';
import { AuthorFormComponent } from '../pages/windows/author-form/author-form.component';
import { AuthorshipFormComponent } from '../pages/windows/authorship-form/authorship-form.component';
import { ContractFormComponent } from '../pages/windows/contract-form/contract-form.component';
import { CostCenterFormComponent } from '../pages/windows/cost-center-form/cost-center-form.component';
import { CostItemFormComponent } from '../pages/windows/cost-item-form/cost-item-form.component';
import { CostTypeFormComponent } from '../pages/windows/cost-type-form/cost-type-form.component';
import { DoiFormComponent } from '../pages/windows/doi-form/doi-form.component';
import { FunderFormComponent } from '../pages/windows/funder-form/funder-form.component';
import { GreaterEntityFormComponent } from '../pages/windows/greater-entity-form/greater-entity-form.component';
import { InstituteFormComponent } from '../pages/windows/institute-form/institute-form.component';
import { InvoiceFormComponent } from '../pages/windows/invoice-form/invoice-form.component';
import { OaCategoryFormComponent } from '../pages/windows/oa-category-form/oa-category-form.component';
import { PubTypeFormComponent } from '../pages/windows/pub-type-form/pub-type-form.component';
import { PublisherFormComponent } from '../pages/windows/publisher-form/publisher-form.component';
import { RoleFormComponent } from '../pages/windows/role-form/role-form.component';
import { StatusFormComponent } from '../pages/windows/status-form/status-form.component';
import { AliasFormComponent } from '../tools/alias-form/alias-form.component';
import { AliasTableComponent } from '../tools/alias-table/alias-table.component';
import { BreadcrumpComponent } from '../tools/breadcrump/breadcrump.component';
import { CombineDialogComponent } from '../tools/combine-dialog/combine-dialog.component';
import { ConfirmDialogComponent } from '../tools/confirm-dialog/confirm-dialog.component';
import { CsvFormatComponent } from '../tools/csv-format/csv-format.component';
import { FilterViewComponent } from '../tools/filter-view/filter-view.component';
import { IdTableComponent } from '../tools/id-table/id-table.component';
import { ImportConfigComponent } from '../tools/import-config/import-config.component';
import { LogDialogComponent } from '../tools/log-dialog/log-dialog.component';
import { PiechartComponent } from '../tools/piechart/piechart.component';
import { SelectAuthorComponent } from '../tools/select-author/select-author.component';
import { SelectEntityComponent } from '../tools/select-entity/select-entity.component';
import { TableComponent } from '../tools/table/table.component';
import { WindowToolbarComponent } from '../tools/window-toolbar/window-toolbar.component';

const MATERIAL_MODULES = [
  ClipboardModule,
  MatAutocompleteModule,
  MatButtonModule,
  MatCardModule,
  MatCheckboxModule,
  MatChipsModule,
  MatDatepickerModule,
  MatDialogModule,
  MatDividerModule,
  MatExpansionModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatMenuModule,
  MatMomentDateModule,
  MatPaginatorModule,
  MatProgressBarModule,
  MatSelectModule,
  MatSnackBarModule,
  MatSortModule,
  MatTableModule,
  MatToolbarModule,
  MatTooltipModule,
];

const DECLARATIONS = [
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
  AliasFormComponent,
  AliasTableComponent,
  BreadcrumpComponent,
  CombineDialogComponent,
  ConfirmDialogComponent,
  CsvFormatComponent,
  FilterViewComponent,
  IdTableComponent,
  ImportConfigComponent,
  LogDialogComponent,
  PiechartComponent,
  SelectAuthorComponent,
  SelectEntityComponent,
  TableComponent,
  WindowToolbarComponent,
];

@NgModule({
  declarations: DECLARATIONS,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ...MATERIAL_MODULES,
    NgbModule,
    HighchartsChartModule,
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ...MATERIAL_MODULES,
    NgbModule,
    HighchartsChartModule,
    ...DECLARATIONS,
  ],
})
export class SharedModule {}
