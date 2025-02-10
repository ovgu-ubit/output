import { Component, OnInit } from '@angular/core';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { FunderService } from 'src/app/services/entities/funder.service';
import { FunderIndex } from '../../../../../../output-interfaces/PublicationIndex';
import { FunderFormComponent } from '../../windows/funder-form/funder-form.component';

@Component({
  selector: 'app-funders',
  templateUrl: './funders.component.html',
  styleUrls: ['./funders.component.css']
})
export class FundersComponent implements TableParent<FunderIndex>, OnInit {
  buttons: TableButton[] = [
  ];

  formComponent = FunderFormComponent;

  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'doi', colTitle: 'DOI', type: 'doi' },
    { colName: 'ror_id', colTitle: 'ROR ID' },
    { colName: 'pub_count', colTitle: 'Anzahl Publikationen', type: 'pubs' },
  ];

  constructor(public funderService: FunderService) { }

  ngOnInit(): void {
  }

  getName() {
    return 'Förderer';
  }

  getLink() {
    return '/master-data/funders'
  }

  getLabel() {
    return '/Stammdaten/Förderer'
  }
}
