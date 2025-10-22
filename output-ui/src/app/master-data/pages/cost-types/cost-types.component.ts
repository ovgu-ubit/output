import { Component, OnInit } from '@angular/core';
import { TableButton, TableHeader, TableParent } from 'src/app/table/table.interface';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';
import { CostType } from '../../../../../../output-interfaces/Publication';
import { CostTypeFormComponent } from '../../../form/cost-type-form/cost-type-form.component';
import { CostTypeIndex } from '../../../../../../output-interfaces/PublicationIndex';

@Component({
  selector: 'app-cost-types',
  templateUrl: './cost-types.component.html',
  styleUrls: ['./cost-types.component.css']
})
export class CostTypesComponent implements TableParent<CostTypeIndex>, OnInit {
  buttons: TableButton[] = [
  ];

  formComponent = CostTypeFormComponent;

  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'pub_count', colTitle: 'Anzahl Publikationen', type: 'pubs' }
  ];

  constructor(public ctService: CostTypeService) { }

  ngOnInit(): void {
  }

  getName() {
    return 'Kostenarten';
  }

  getLink() {
    return '/master-data/cost_types'
  }

  getLabel() {
    return '/Stammdaten/Kostenarten'
  }
}
