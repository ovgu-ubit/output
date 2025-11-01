import { Component, OnInit } from '@angular/core';
import { TableButton, TableHeader, TableParent } from 'src/app/table/table.interface';
import { PublicationTypeService } from 'src/app/services/entities/publication-type.service';
import { PublicationTypeIndex } from '../../../../../../output-interfaces/PublicationIndex';
import { PubTypeFormComponent } from '../../../form/pub-type-form/pub-type-form.component';

@Component({
    selector: 'app-pub-types',
    templateUrl: './pub-types.component.html',
    styleUrls: ['./pub-types.component.css'],
    standalone: false
})
export class PubTypesComponent implements TableParent<PublicationTypeIndex>, OnInit {
  buttons: TableButton[] = [
  ];

  formComponent = PubTypeFormComponent;

  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'review', colTitle: 'Begutachtet?', type: 'boolean' },
    { colName: 'pub_count', colTitle: 'Anzahl Publikationen', type: 'pubs' },
  ];

  constructor(public pubTypeService: PublicationTypeService) { }

  ngOnInit(): void {
  }

  getName() {
    return 'Publikationsarten';
  }

  getLink() {
    return '/master-data/pub_types'
  }

  getLabel() {
    return '/Stammdaten/Publikationsarten'
  }
}
