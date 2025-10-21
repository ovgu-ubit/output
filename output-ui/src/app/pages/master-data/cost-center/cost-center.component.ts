import { Component, OnInit, ViewChild } from '@angular/core';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { CostCenterService } from 'src/app/services/entities/cost-center.service';
import { CostCenter } from '../../../../../../output-interfaces/Publication';
import { CostCenterIndex } from '../../../../../../output-interfaces/PublicationIndex';
import { CostCenterFormComponent } from '../../windows/cost-center-form/cost-center-form.component';
import { TableComponent } from 'src/app/table/table-component/table.component';

@Component({
  selector: 'app-cost-center',
  templateUrl: './cost-center.component.html',
  styleUrls: ['./cost-center.component.css']
})
export class CostCenterComponent implements TableParent<CostCenterIndex>, OnInit {
  buttons: TableButton[] = [
  ];

  formComponent = CostCenterFormComponent;

  @ViewChild(TableComponent) table: TableComponent<CostCenter, CostCenter>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'number', colTitle: 'Nummer' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'pub_count', colTitle: 'Anzahl Publikationen', type: 'pubs' }
  ];

  constructor(public ccService: CostCenterService) { }

  ngOnInit(): void {
  }

  getName() {
    return 'Kostenstellen';
  }

  getLink() {
    return '/master-data/cost_centers'
  }

  getLabel() {
    return '/Stammdaten/Kostenstellen'
  }
}
