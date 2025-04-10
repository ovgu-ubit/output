import { AfterViewInit, Component, inject, Inject, OnInit, ViewChild } from '@angular/core';
import { FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { EntityFormComponent } from 'src/app/interfaces/service';
import { AuthorService } from 'src/app/services/entities/author.service';
import { InstituteService } from 'src/app/services/entities/institute.service';
import { Author, Institute } from '../../../../../../output-interfaces/Publication';
import { AbstractFormComponent } from '../abstract-form/abstract-form.component';
import { InstituteFormComponent } from '../institute-form/institute-form.component';
import { map, Observable, of } from 'rxjs';

@Component({
  selector: 'app-author-form',
  templateUrl: './author-form.component.html',
  styleUrls: ['./author-form.component.css']
})
export class AuthorFormComponent extends AbstractFormComponent<Author> implements OnInit, AfterViewInit, EntityFormComponent<Author> {

  override name = "Person"
  override fields = [
    { key: 'id', title: 'ID', type: 'number' },
    { key: 'title', title: 'Titel' },
    { key: 'first_name', title: 'Vorname(n)', required: true },
    { key: 'last_name', title: 'Nachname', required: true },
    { key: 'orcid', title: 'ORCID', pattern: /^(\d{4}-){3}\d{3}(\d|X)$/ },
    { key: 'gnd_id', title: 'GND-ID', pattern: /^[0-9X-]*$/ },
    // { key: 'inst', title: 'Institute', type: 'institute' },
    // { key: 'alias_first', title: 'Aliase Vorname', type: 'alias' },
    // { key: 'alias_last', title: 'Aliase Nachname', type: 'alias' },
  ]

  aliasForm: FormGroup = this.formBuilder.group({
    alias: [''],
    first_name: ['']
  });

  override entity: Author;
  displayedColumns: string[] = ['id', 'label', 'short_label', 'delete'];

  @ViewChild(MatTable) table: MatTable<Institute>;
  @ViewChild('tableAlias') tableAlias: MatTable<{ alias: string, first_name: boolean }>;
  alias_data: { alias: string, first_name: boolean }[];

  override service = inject(AuthorService)

  instForm = InstituteFormComponent;

  constructor(public override dialogRef: MatDialogRef<AuthorFormComponent>, @Inject(MAT_DIALOG_DATA) public override data: any, public instService: InstituteService) { super(); }

  override ngOnInit(): void {
    this.form = this.formBuilder.group({
      id: [''],
      title: [''],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      orcid: ['', Validators.pattern(/^(\d{4}-){3}\d{3}(\d|X)$/)],
      gnd_id: ['', Validators.pattern(/^[0-9X-]*$/)]
    });
  }

  override postProcessing: Observable<any> =
    of(1).pipe(map(data => {
      this.updateAlias();
    }))

  deleteInst(row) {
    if (this.disabled) return;
    this.entity.institutes = this.entity.institutes.filter(e => e.id !== row.id)
  }

  setInst(event) {
    if (!this.entity.institutes) this.entity.institutes = [];
    if (!this.entity.institutes.find(e => e.id === event.id)) this.entity.institutes.push(event)
    if (this.table) this.table.dataSource = new MatTableDataSource<Institute>(this.entity.institutes);
  }

  deleteAlias(elem: { alias: string, first_name: boolean }) {
    if (this.disabled) return;
    if (elem.first_name) this.entity.aliases_first_name = this.entity.aliases_first_name.filter(e => e.alias !== elem.alias)
    else this.entity.aliases_last_name = this.entity.aliases_last_name.filter(e => e.alias !== elem.alias)
    this.updateAlias();
  }

  addAlias() {
    if (this.disabled) return;
    if (this.aliasForm.invalid) return;
    if (this.aliasForm.get('first_name').value === undefined || this.aliasForm.get('first_name').value === null) return;

    if (!this.entity.aliases_first_name) this.entity.aliases_first_name = [];
    if (!this.entity.aliases_last_name) this.entity.aliases_last_name = [];

    if (this.aliasForm.get('first_name').value) {
      this.entity.aliases_first_name.push({
        alias: this.aliasForm.get('alias').value.toLocaleLowerCase().trim(),
        elementId: this.entity.id
      })
    } else this.entity.aliases_last_name.push({
      alias: this.aliasForm.get('alias').value.toLocaleLowerCase().trim(),
      elementId: this.entity.id
    })
    this.aliasForm.reset();
    this.updateAlias();
  }

  updateAlias() {
    this.alias_data = this.entity.aliases_first_name?.map(e => { return { alias: e.alias, first_name: true } })
    this.alias_data = this.alias_data.concat(this.entity.aliases_last_name?.map(e => { return { alias: e.alias, first_name: false } }));
    if (this.tableAlias) this.tableAlias.dataSource = new MatTableDataSource<{ alias: string, first_name: boolean }>(this.alias_data);
  }
}

