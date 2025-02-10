import { Component, OnInit } from '@angular/core';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { StatusService } from 'src/app/services/entities/status.service';
import { Status } from '../../../../../../output-interfaces/Publication';
import { StatusFormComponent } from '../../windows/status-form/status-form.component';

@Component({
  selector: 'app-statuses',
  templateUrl: './statuses.component.html',
  styleUrl: './statuses.component.css'
})
export class StatusesComponent implements TableParent<Status>, OnInit {
  buttons: TableButton[] = [
  ];

  formComponent = StatusFormComponent;

  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'Status', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'description', colTitle: 'Beschreibung' }
  ];

  constructor(public statusService: StatusService) { }

  ngOnInit(): void {
  }

  getName() {
    return 'Status';
  }

  getLink() {
    return '/master-data/status'
  }

  getLabel() {
    return '/Stammdaten/Status'
  }
}

