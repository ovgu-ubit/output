import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject, concatMap, of } from 'rxjs';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { selectReportingYear } from 'src/app/services/redux';
import { TableComponent } from 'src/app/tools/table/table.component';
import { Publisher } from '../../../../../../output-interfaces/Publication';
import { PublisherIndex } from '../../../../../../output-interfaces/PublicationIndex';
import { PublisherFormComponent } from '../../windows/publisher-form/publisher-form.component';

@Component({
  selector: 'app-publishers',
  templateUrl: './publishers.component.html',
  styleUrls: ['./publishers.component.css']
})
export class PublishersComponent implements TableParent<PublisherIndex>, OnInit {
  buttons: TableButton[] = [
  ];
  loading: boolean = true;
  destroy$ = new Subject();

  formComponent = PublisherFormComponent;

  publishers: PublisherIndex[] = [];

  reporting_year;

  @ViewChild(TableComponent) table: TableComponent<PublisherIndex, Publisher>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'doi_prefix', colTitle: 'DOI Prefix' },
    { colName: 'pub_count', colTitle: 'Anzahl Publikationen', type: 'pubs' },
  ];

  constructor(public publisherService: PublisherService, private dialog: MatDialog, private _snackBar: MatSnackBar, private publicationService: PublicationService,
    private store: Store, private router: Router) { }

  ngOnInit(): void {
    this.loading = true;
    this.store.select(selectReportingYear).pipe(concatMap(data => {
      if (data) {
        return of(data);
      } else {
        return this.publicationService.getDefaultReportingYear();
      }
    }), concatMap(data => {
      this.reporting_year = data;
      this.headers.find(e => e.colName === 'pub_count').colTitle += ' ' + data
      return this.publisherService.index(data);
    })).subscribe({
      next: data => {
        this.publishers = data;
        this.loading = false;
        this.table?.update(this.publishers);
      }, error: err => this._snackBar.open(`Backend nicht erreichbar`, 'Oh oh!', {
        panelClass: [`danger-snackbar`],
        verticalPosition: 'top'
      })
    })
  }

  getName() {
    return 'Verlage';
  }

  getLink() {
    return '/master-data/publishers'
  }

  getLabel() {
    return '/Stammdaten/Verlage'
  }
}

