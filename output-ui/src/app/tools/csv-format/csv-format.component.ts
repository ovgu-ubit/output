import { Component, OnInit, Inject, ViewChild, AfterViewInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CSVMapping } from '../../../../../output-interfaces/Config';
import { ImportService } from 'src/app/services/import.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSelect } from '@angular/material/select';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-csv-format',
  templateUrl: './csv-format.component.html',
  styleUrls: ['./csv-format.component.css']
})
export class CsvFormatComponent implements OnInit, AfterViewInit {

  public form: FormGroup;

  format: CSVMapping;
  available_formats: CSVMapping[];

  newFormat = {
    name: 'Neues Format anlegen',
    encoding: '',
    delimiter: '',
    header: false,
    quotes: false,
    date_format: '',
    quoteChar: '',
    id_ge_type: '',
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
      editors: '',
      abstract: '',
      citation: '',
      page_count: '',
      peer_reviewed: '',
    }
  }
  kill = new Subject();

  @ViewChild(MatSelect) select: MatSelect;

  constructor(public dialogRef: MatDialogRef<CsvFormatComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any, private importService: ImportService,
    private formBuilder: FormBuilder) { }

  ngOnInit(): void {
    this.format = this.data.csvFormat;
    if (!this.format) this.format = this.newFormat;
    this.importService.getCSVMappings().subscribe({
      next: data => {
        this.available_formats = data;
        this.available_formats.unshift(this.newFormat)
      }
    })
    this.form = this.formBuilder.group({
      name: ['', Validators.required],
      encoding: ['', Validators.required],
      header: [''],
      quotes: [''],
      delimiter: ['', Validators.required],
      quoteChar: [''],
      date_format: [''],
      id_ge_type: [''],
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
        editors:[''],
        abstract: [''],
        citation: [''],
        page_count: [''],
        peer_reviewed: [''],
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
