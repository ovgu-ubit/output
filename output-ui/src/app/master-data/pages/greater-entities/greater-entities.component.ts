import { Component, OnInit } from '@angular/core';
import { TableButton, TableHeader, TableParent } from 'src/app/table/table.interface';
import { GreaterEntityService } from 'src/app/services/entities/greater-entity.service';
import { GreaterEntityIndex } from '../../../../../../output-interfaces/PublicationIndex';
import { GreaterEntityFormComponent } from '../../../form/greater-entity-form/greater-entity-form.component';

@Component({
  selector: 'app-greater-entities',
  templateUrl: './greater-entities.component.html',
  styleUrls: ['./greater-entities.component.css']
})
export class GreaterEntitiesComponent implements TableParent<GreaterEntityIndex>, OnInit {
  buttons: TableButton[] = [
  ];

  formComponent = GreaterEntityFormComponent;

  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'rating', colTitle: 'Bemerkung' },
    { colName: 'identifiers', colTitle: 'Identifikatoren' },
    { colName: 'doaj_since', colTitle: 'Im DOAJ seit', type: 'date' },
    { colName: 'doaj_until', colTitle: 'Im DOAJ bis', type: 'date' },
    { colName: 'pub_count', colTitle: 'Anzahl Publikationen', type: 'pubs' },
    { colName: 'pub_count_total', colTitle: 'Anzahl Publikationen insg.', type: 'pubs' },
  ];

  constructor(public geService: GreaterEntityService) { }

  ngOnInit(): void {
  }

  getName() {
    return 'Größere Einheiten';
  }

  getLink() {
    return '/master-data/greater-entities'
  }

  getLabel() {
    return '/Stammdaten/Größere Einheiten'
  }
}

