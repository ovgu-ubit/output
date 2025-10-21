import { Component, OnInit, ViewChild } from '@angular/core';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { PublicationDuplicateService } from 'src/app/services/entities/duplicate.service';
import { CombineDialogComponent } from 'src/app/tools/combine-dialog/combine-dialog.component';
import { DuplicateDialogComponent } from 'src/app/tools/duplicate-dialog/duplicate-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TableComponent } from 'src/app/tools/table/table.component';
import { PublicationDuplicate } from '../../../../../../output-interfaces/Publication';

@Component({
  selector: 'app-duplicates',
  templateUrl: './duplicates.component.html',
  styleUrl: './duplicates.component.css'
})
export class DuplicatesComponent implements TableParent<PublicationDuplicate>, OnInit {
  buttons: TableButton[] = [
    { title: 'Nicht zutreffende Dubletten verwalten', action_function: this.soft.bind(this, true), roles: ['writer', 'admin'] },
    { title: 'Nicht bearbeitete Dubletten verwalten', action_function: this.soft.bind(this, false), roles: ['writer', 'admin'] },
  ];
  not_editable = true;
  not_selectable = true;

  indexOptions?: any;
  name: string;

  formComponent = DuplicateDialogComponent;

  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'id_first', colTitle: 'ID 1', type: 'number' },
    { colName: 'id_second', colTitle: 'ID 2', type: 'number' },
    { colName: 'description', colTitle: 'Beschreibung' }
  ];

  @ViewChild(TableComponent) table: TableComponent<PublicationDuplicate, PublicationDuplicate>;

  constructor(public duplicateService: PublicationDuplicateService, private _snackBar: MatSnackBar) { }

  soft(soft: boolean) {
    this.name = 'Soft-deleted Publikationen';
    this._snackBar.open(`Ansicht wurde geändert`, 'Super!', {
      duration: 5000,
      panelClass: [`success-snackbar`],
      verticalPosition: 'top'
    });
    this.indexOptions = { soft }
    this.table.updateData().subscribe()
  }

  ngOnInit(): void {
  }

  getName() {
    if (!this.indexOptions?.soft) return 'Publikationsdubletten';
    else return 'Nicht zutreffende Publikationsdubletten';
  }

  getLink() {
    return '/administration/duplicates'
  }

  getLabel() {
    return '/Verwaltung/Dubletten'
  }
}
