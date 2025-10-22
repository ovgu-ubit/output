import { Component, OnInit } from '@angular/core';
import { TableButton, TableHeader, TableParent } from 'src/app/table/table.interface';
import { InstituteService } from 'src/app/services/entities/institute.service';
import { Institute } from '../../../../../../output-interfaces/Publication';
import { InstituteFormComponent } from '../../../form/institute-form/institute-form.component';

@Component({
  selector: 'app-institutions',
  templateUrl: './institutions.component.html',
  styleUrls: ['./institutions.component.css']
})
export class InstitutionsComponent implements TableParent<Institute>, OnInit {
  buttons: TableButton[] = [
  ];

  formComponent = InstituteFormComponent;

  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'short_label', colTitle: 'Kurzbezeichnung' },
    { colName: 'opus_id', colTitle: 'OPUS-ID' },
    { colName: 'sub_inst_count', colTitle: 'Untergeordnete Institute gesamt', type: 'number' },
    { colName: 'author_count', colTitle: 'Anzahl Personen', type: 'number' },
    { colName: 'author_count_total', colTitle: 'Anzahl Personen gesamt', type: 'number' },
    { colName: 'pub_count', colTitle: 'Anzahl Publikationen', type: 'pubs' },
    { colName: 'pub_count_corr', colTitle: 'Anzahl Publikationen (corr.)', type: 'pubs' },
  ];

  constructor(public instService: InstituteService) { }

  ngOnInit(): void {
  }

  getName() {
    return 'Institute';
  }

  getLink() {
    return '/master-data/institutions'
  }

  getLabel() {
    return '/Stammdaten/Institute'
  }
}
