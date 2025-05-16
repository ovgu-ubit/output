import { Component, OnInit } from '@angular/core';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { PublicationDuplicate } from '../../../../../../output-api/src/entity/PublicationDuplicate';
import { PublicationDuplicateService } from 'src/app/services/entities/duplicate.service';
import { CombineDialogComponent } from 'src/app/tools/combine-dialog/combine-dialog.component';
import { DuplicateDialogComponent } from 'src/app/tools/duplicate-dialog/duplicate-dialog.component';

@Component({
  selector: 'app-duplicates',
  templateUrl: './duplicates.component.html',
  styleUrl: './duplicates.component.css'
})
export class DuplicatesComponent implements TableParent<PublicationDuplicate>, OnInit {
  buttons: TableButton[] = [
  ];

  formComponent = DuplicateDialogComponent;

  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'id_first', colTitle: 'ID 1', type: 'number' },
    { colName: 'id_second', colTitle: 'ID 2', type: 'number' },
    { colName: 'description', colTitle: 'Beschreibung' }
  ];

  constructor(public duplicateService: PublicationDuplicateService) { }

  ngOnInit(): void {
  }

  getName() {
    return 'Publikationsdubletten';
  }

  getLink() {
    return '/administration/duplicates'
  }

  getLabel() {
    return '/Verwaltung/Dubletten'
  }
}
