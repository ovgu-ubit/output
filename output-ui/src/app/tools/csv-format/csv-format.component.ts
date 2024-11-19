import { Component, OnInit, Inject, ViewChild, AfterViewInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CSVMapping } from '../../../../../output-interfaces/Config';
import { ImportService } from 'src/app/services/import.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSelect } from '@angular/material/select';
import { Subject, takeUntil } from 'rxjs';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { ConfigService } from 'src/app/services/config.service';

@Component({
  selector: 'app-csv-format',
  templateUrl: './csv-format.component.html',
  styleUrls: ['./csv-format.component.css']
})
export class CsvFormatComponent implements OnInit, AfterViewInit {

  public form: FormGroup;

  csv = false;

  format: CSVMapping;
  available_formats: CSVMapping[];

  newFormat:CSVMapping = {
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

  optional_fields;

  constructor(public dialogRef: MatDialogRef<CsvFormatComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any, private importService: ImportService,private configService:ConfigService,
    private formBuilder: FormBuilder) { }

  ngOnInit(): void {
    this.configService.getOptionalFields().subscribe(data => {
      this.optional_fields = data;
    });
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
