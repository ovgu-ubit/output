import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { TableComponent } from './table-component/table.component';
import { MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';
import { MatPaginatorDE } from './mat-paginator-de';
import { CombineDialogComponent } from './dialog/combine-dialog/combine-dialog.component';
import { AliasFormComponent } from './dialog/alias-form/alias-form.component';
import { MatSortModule } from '@angular/material/sort';
import { RouterModule } from '@angular/router';
import { TableFilterComponent } from './table-filter/table-filter.component';
import { TableAuthorsPipe, TableDoiPipe, TableEuroPipe, TableFormatNumberPipe, TableGndPipe, TableOrcidPipe, TableTruncatePipe } from './pipes/table-format.pipe';

@NgModule({
  declarations: [
    TableComponent,
    CombineDialogComponent,
    AliasFormComponent,
    TableFilterComponent,
    TableDoiPipe,
    TableOrcidPipe,
    TableGndPipe,
    TableEuroPipe,
    TableAuthorsPipe,
    TableFormatNumberPipe,
    TableTruncatePipe
  ],
  imports: [
    SharedModule,
    MatPaginatorModule,
    MatSortModule,
    RouterModule
  ],
  exports: [
    TableComponent,
    TableDoiPipe,
    TableOrcidPipe,
    TableGndPipe,
    TableEuroPipe,
    TableAuthorsPipe,
    TableFormatNumberPipe,
    TableTruncatePipe
  ],
  providers: [
    { provide: MatPaginatorIntl, useClass: MatPaginatorDE },
  ]
})
export class TableModule { }
