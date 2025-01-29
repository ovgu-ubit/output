import { Component, OnInit } from '@angular/core';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { PublisherService } from 'src/app/services/entities/publisher.service';
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

  formComponent = PublisherFormComponent;

  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'doi_prefix', colTitle: 'DOI Prefix' },
    { colName: 'pub_count', colTitle: 'Anzahl Publikationen', type: 'pubs' },
  ];

  constructor(public publisherService: PublisherService) { }

  ngOnInit(): void {
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

