import { Component, OnInit } from '@angular/core';
import { TableButton, TableHeader, TableParent } from 'src/app/table/table.interface';
import { OACategoryService } from 'src/app/services/entities/oa-category.service';
import { OACategoryIndex } from '../../../../../../output-interfaces/PublicationIndex';
import { OaCategoryFormComponent } from '../../../form/oa-category-form/oa-category-form.component';

@Component({
    selector: 'app-oa-categories',
    templateUrl: './oa-categories.component.html',
    styleUrls: ['./oa-categories.component.css'],
    standalone: false
})
export class OaCategoriesComponent implements TableParent<OACategoryIndex>, OnInit {
  buttons: TableButton[] = [
  ];

  formComponent = OaCategoryFormComponent;

  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'is_oa', colTitle: 'Open-Access?', type: 'boolean' },
    { colName: 'pub_count', colTitle: 'Anzahl Publikationen', type: 'pubs' },
  ];

  constructor(public oaService: OACategoryService) { }

  ngOnInit(): void {
  }

  getName() {
    return 'Open-Access-Kategorien';
  }

  getLink() {
    return '/master-data/oa-categories'
  }

  getLabel() {
    return '/Stammdaten/Open-Access-Kategorien'
  }
}
