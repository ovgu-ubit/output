import { Component, OnInit } from '@angular/core';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';
import { CostType } from '../../../../../../output-interfaces/Publication';
import { CostTypeFormComponent } from '../../windows/cost-type-form/cost-type-form.component';

@Component({
  selector: 'app-cost-types',
  templateUrl: './cost-types.component.html',
  styleUrls: ['./cost-types.component.css']
})
export class CostTypesComponent implements TableParent<CostType>, OnInit {
  buttons: TableButton[] = [
  ];

  formComponent = CostTypeFormComponent;

  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' }
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
