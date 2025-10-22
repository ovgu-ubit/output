import { Component, OnInit } from '@angular/core';
import { TableButton, TableHeader, TableParent } from 'src/app/table/table.interface';
import { AuthorService } from 'src/app/services/entities/author.service';
import { AuthorIndex } from '../../../../../../output-interfaces/PublicationIndex';
import { AuthorFormComponent } from 'src/app/form/author-form/author-form.component';

@Component({
  selector: 'app-authors',
  templateUrl: './authors.component.html',
  styleUrls: ['./authors.component.css']
})
export class AuthorsComponent implements TableParent<AuthorIndex>, OnInit {
  buttons: TableButton[] = [
  ];

  formComponent = AuthorFormComponent;

  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'title', colTitle: 'Titel' },
    { colName: 'first_name', colTitle: 'Vorname' },
    { colName: 'last_name', colTitle: 'Nachname' },
    { colName: 'orcid', colTitle: 'ORCID', type: 'orcid' },
    { colName: 'gnd_id', colTitle: 'GND-Nr.', type: 'gnd' },
    { colName: 'institutes', colTitle: 'Institute' },
    { colName: 'pub_count', colTitle: 'Anzahl Publikationen', type: 'pubs' },
    { colName: 'pub_count_corr', colTitle: 'Anzahl Publikationen (corr.)', type: 'pubs' },
    { colName: 'pub_count_total', colTitle: 'Anzahl Publikationen insg.', type: 'pubs' },
  ];

  constructor(public authorService: AuthorService) { }

  ngOnInit(): void {
  }

  getName() {
    return 'Personen';
  }

  getLink() {
    return '/authors'
  }

  getLabel() {
    return '/Personen'
  }
}
