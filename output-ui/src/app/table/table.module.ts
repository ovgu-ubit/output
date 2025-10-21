import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { TableComponent } from './table-component/table.component';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { MatPaginatorDE } from './mat-paginator-de';
import { CombineDialogComponent } from './dialog/combine-dialog/combine-dialog.component';
import { AliasFormComponent } from './dialog/alias-form/alias-form.component';

@NgModule({
  declarations: [
    TableComponent,
    CombineDialogComponent,
    AliasFormComponent
  ],
  imports: [
    SharedModule
  ],
  exports: [
    TableComponent
  ],
  providers: [
    { provide: MatPaginatorIntl, useClass: MatPaginatorDE },
  ]
})
export class TableModule { }
