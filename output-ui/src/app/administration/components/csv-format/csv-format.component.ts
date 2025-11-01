import { Component, OnInit, Inject, ViewChild, AfterViewInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ImportService } from 'src/app/administration/services/import.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSelect } from '@angular/material/select';
import { map, merge, Subject, takeUntil } from 'rxjs';
import { CSVMapping } from '../../../../../../output-interfaces/Config';
import { ConfigService } from '../../services/config.service';

@Component({
  selector: 'app-csv-format',
  templateUrl: './csv-format.component.html',
  styleUrls: ['./csv-format.component.css'],
  standalone: false
})
export class CsvFormatComponent implements OnInit, AfterViewInit {

  public form: FormGroup;

  csv = false;

  format: CSVMapping;
  available_formats: CSVMapping[];

  newFormat: CSVMapping = {
    name: 'Neues Format anlegen',
    encoding: '',
    delimiter: '',
    header: false,
    quotes: false,
    date_format: '',
    quoteChar: '',
    id_ge_type: '',
    last_name_first: false,
    split_authors: '',
    deal_flat_fee: false,
    mapping: {
      author_inst: '',
      authors: '',
      title: '',
      pub_type: '',
      oa_category: '',
      greater_entity: '',
      id_ge: '',
      publisher: '',
      contract: '',
      funder: '',
      doi: '',
      pub_date: '',
      pub_date_print: '',
      pub_date_accepted: '',
      pub_date_submitted: '',
      link: '',
      language: '',
      license: '',
      invoice: '',
      status: '',
      abstract: '',
      volume: '',
      issue: '',
      first_page: '',
      last_page: '',
      publisher_location: '',
      edition: '',
      article_number: '',
      page_count: '',
      peer_reviewed: '',
      cost_approach: ''
    }
  }
  kill = new Subject();

  @ViewChild(MatSelect) select: MatSelect;

  optional_fields: {
    abstract?: boolean,
    citation?: boolean,
    page_count?: boolean,
    pub_date_submitted?: boolean,
    pub_date_print?: boolean,
    peer_reviewed?: boolean
  } = {};

  constructor(public dialogRef: MatDialogRef<CsvFormatComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any, private importService: ImportService, private configService: ConfigService,
    private formBuilder: FormBuilder) { }

  ngOnInit(): void {

    let ob$ = this.configService.get("optional_fields_abstract").pipe(map(data => {
      this.optional_fields.abstract = data.value;
    }));
    ob$ = merge(ob$, this.configService.get("optional_fields_citation").pipe(map(data => {
      this.optional_fields.citation = data.value;
    })));
    ob$ = merge(ob$, this.configService.get("optional_fields_page_count").pipe(map(data => {
      this.optional_fields.page_count = data.value;
    })));
    ob$ = merge(ob$, this.configService.get("optional_fields_pub_date_submitted").pipe(map(data => {
      this.optional_fields.pub_date_submitted = data.value;
    })));
    ob$ = merge(ob$, this.configService.get("optional_fields_pub_date_print").pipe(map(data => {
      this.optional_fields.pub_date_print = data.value;
    })));
    ob$ = merge(ob$, this.configService.get("optional_fields_peer_reviewed").pipe(map(data => {
      this.optional_fields.peer_reviewed = data.value;
    })));

    ob$.subscribe();
    this.format = this.data.csvFormat;
    this.csv = this.data.path.includes("csv")
    if (!this.format) this.format = this.newFormat;
    this.importService.getCSVMappings().subscribe({
      next: data => {
        this.available_formats = data;
        this.available_formats.unshift(this.newFormat)
      }
    })
    this.form = this.formBuilder.group({
      name: ['', Validators.required],
      encoding: [''],
      header: [''],
      quotes: [''],
      delimiter: [''],
      quoteChar: [''],
      date_format: [''],
      id_ge_type: [''],
      last_name_first: [''],
      split_authors: [''],
      deal_flat_fee: [''],
      mapping: this.formBuilder.group({
        author_inst: [''],
        authors: [''],
        title: [''],
        pub_type: [''],
        oa_category: [''],
        greater_entity: [''],
        id_ge: [''],
        publisher: [''],
        contract: [''],
        funder: [''],
        doi: [''],
        pub_date: [''],
        pub_date_print: [''],
        pub_date_accepted: [''],
        pub_date_submitted: [''],
        link: [''],
        language: [''],
        license: [''],
        invoice: [''],
        status: [''],
        abstract: [''],
        volume: [''],
        issue: [''],
        first_page: [''],
        last_page: [''],
        page_count: [''],
        peer_reviewed: [''],
        publisher_location: [''],
        edition: [''],
        article_number: [''],
        cost_approach: [''],
      })
    })
    this.form.patchValue(this.format)
  }

  mapping() {
    return this.form.get('mapping') as FormGroup;
  }

  ngAfterViewInit(): void {
    this.select.optionSelectionChanges.pipe(takeUntil(this.kill)).subscribe({
      next: data => {
        this.format = data.source.value;
        this.form.patchValue(this.format)
      }
    })
  }

  compareFormats(f1, f2) {
    return f1?.name.localeCompare(f2?.name) === 0;
  }

  action() {
    if (this.form.invalid || this.form.get('name').value === 'Neues Format anlegen') return;
    this.kill.next('');
    this.format = this.form.getRawValue();
    this.importService.setCSVMapping(this.format).subscribe({
      next: data => {
        this.dialogRef.close(this.format)
      }
    })
  }

  abort() {
    this.dialogRef.close(null)
  }

  delete() {
    this.importService.deleteCSVMapping(this.format).subscribe({
      next: data => {
        console.log('deleted')
        this.abort();
      }
    })
  }
}
