import { AfterViewInit, Component, ElementRef, Inject, Injectable, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { Observable, map, merge, startWith } from 'rxjs';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { ConfigService } from 'src/app/services/config.service';
import { AuthorService } from 'src/app/services/entities/author.service';
import { ContractService } from 'src/app/services/entities/contract.service';
import { FunderService } from 'src/app/services/entities/funder.service';
import { GreaterEntityService } from 'src/app/services/entities/greater-entity.service';
import { InvoiceService } from 'src/app/services/entities/invoice.service';
import { LanguageService } from 'src/app/services/entities/language.service';
import { OACategoryService } from 'src/app/services/entities/oa-category.service';
import { PublicationTypeService } from 'src/app/services/entities/publication-type.service';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { StatusService } from 'src/app/services/entities/status.service';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';
import { AuthorPublication, Contract, Funder, GreaterEntity, Invoice, Language, OA_Category, Publication, PublicationIdentifier, PublicationType, Publisher, Status } from '../../../../../../output-interfaces/Publication';
import { AuthorshipFormComponent } from '../authorship-form/authorship-form.component';
import { ContractFormComponent } from '../contract-form/contract-form.component';
import { GreaterEntityFormComponent } from '../greater-entity-form/greater-entity-form.component';
import { InvoiceFormComponent } from '../invoice-form/invoice-form.component';
import { PublisherFormComponent } from '../publisher-form/publisher-form.component';

@Injectable({ providedIn: 'root' })
export class PubValidator {
  public pubValidator(): ValidatorFn {
    return (formGroup: FormGroup) => {
      let t1, t2 = null;
      if (!(formGroup.get('biblio_info').get('pub_date').value || formGroup.get('biblio_info').get('pub_date_print').value || formGroup.get('biblio_info').get('pub_date_accepted').value || formGroup.get('biblio_info').get('pub_date_submitted').value))
        t1 = { no_pub_date: true }
      if (!formGroup.get('title').value && !formGroup.get('doi').value)
        t2 = { no_title_or_doi: true }
      if (!t1 && !t2) return null;
      else return { ...t1, ...t2 };
    };
  }
}

@Component({
  selector: 'app-publication-form',
  templateUrl: './publication-form.component.html',
  styleUrls: ['./publication-form.component.css']
})
export class PublicationFormComponent implements OnInit, AfterViewInit {
  institution: string;
  public form: FormGroup;
  public idForm: FormGroup;
  submitted = false;

  edit: boolean = false;
  loading: boolean;
  pub: Publication;

  pub_types: PublicationType[];
  oa_categories: OA_Category[];
  langs: Language[];
  greater_entities: GreaterEntity[];
  filtered_greater_entities: Observable<GreaterEntity[]>;
  publishers: Publisher[];
  filtered_publishers: Observable<Publisher[]>;
  contracts: Contract[];
  filtered_contracts: Observable<Contract[]>;
  funders: Funder[];
  filteredFunders: Observable<Funder[]>;
  statuses: Status[];

  displayedColumns: string[] = ['date', 'costs', 'edit', 'delete'];
  displayedColumnsId: string[] = ['type', 'value', 'delete'];
  displayedColumnsAuthors: string[] = ['edit', 'name', 'corr', 'institute', 'role', 'delete'];

  @ViewChild('funderInput') funderInput: ElementRef<HTMLInputElement>;
  @ViewChild('tableInvoice') table: MatTable<Invoice>;
  @ViewChild('table') tableAuthors: MatTable<AuthorPublication>;
  @ViewChild('tableID') tableId: MatTable<PublicationIdentifier>;

  today = new Date();
  disabled = false;
  licenses = ['cc-by', 'cc-by-nc', 'cc-by-nd', 'cc-by-sa', 'cc-by-nc-nd', 'cc-by-nc-sa', 'Sonstige']
  optional_fields;

  constructor(public dialogRef: MatDialogRef<PublicationFormComponent>, public tokenService: AuthorizationService, private pubValidator: PubValidator,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private publicationService: PublicationService,
    private dialog: MatDialog, private pubTypeService: PublicationTypeService, private authorService: AuthorService, private _snackBar: MatSnackBar,
    private oaService: OACategoryService, private geService: GreaterEntityService, private publisherService: PublisherService, private contractService: ContractService,
    private funderService: FunderService, private languageService: LanguageService, private invoiceService: InvoiceService, private configService: ConfigService,
    private statusService: StatusService) {
    this.form = this.formBuilder.group({
      id: [''],
      title: [''],
      doi: [''],
      link: [''],
      add_info: [''],
      import_date: [''],
      edit_date: [''],
      delete_date: [''],
      dataSource: [''],
      status: [''],
      author_info: this.formBuilder.group({
        authors: [''],
      }),
      biblio_info: this.formBuilder.group({
        pub_type: [''],
        ge: [''],
        peer_reviewed: [''],
        publ: [''],
        pub_date: [''],
        pub_date_print: [''],
        pub_date_submitted: [''],
        pub_date_accepted: [''],
        language: [''],
        abstract: [''],
        volume: [''],
        issue: [''],
        first_page: [''],
        last_page: [''],
        publisher_location: [''],
        edition: [''],
        article_number: [''],
        page_count: [''],
      }),
      oa_info: this.formBuilder.group({
        oa_cat: [''],
        second_pub: [''],
        is_oa: [''],
        oa_status: [''],
        is_journal_oa: [''],
        best_oa_host: [''],
        best_oa_license: [''],
      }),
      finance_info: this.formBuilder.group({
        contr: [''],
        funder: [''],
        cost_approach: ['']
      }),
    }, {
      validators: [this.pubValidator.pubValidator()]
    });
    this.form.get('id').disable();
    this.form.get('oa_info').get('is_oa').disable();
    this.form.get('oa_info').get('oa_status').disable();
    this.form.get('oa_info').get('is_journal_oa').disable();
    this.form.get('oa_info').get('best_oa_host').disable();

    this.idForm = this.formBuilder.group({
      type: ['', Validators.required],
      value: ['', Validators.required]
    })
  }

  ngOnInit(): void {
    let ob$ = this.configService.getOptionalFields().pipe(map(data => {
      this.optional_fields = data;
    }
    ));
    ob$ = merge(ob$, this.configService.getInstition().pipe(map(data => {
      this.institution = data.short_label;
    }
    )));
    if (this.data.entity?.id) {
      this.edit = true;
      this.loading = true;
      ob$ = merge(ob$, this.loadPub(this.data.entity?.id));
    } else {
      this.edit = false;
      this.pub = {
        authorPublications: [],
        identifiers: []
      };
    }
    ob$ = merge(ob$, this.loadMasterData());


    ob$.subscribe({
      complete: () => {
      }
    })
  }

  loadPub(id: number) {
    return this.publicationService.getOne(id).pipe(map(data => {
      this.pub = data;
      this.form.patchValue(data);
      this.form.get('author_info').patchValue(data);
      this.form.get('biblio_info').patchValue(data);
      this.form.get('oa_info').patchValue(data);
      this.form.get('finance_info').patchValue(data);
      this.form.get('oa_info').get('oa_cat').setValue(this.pub.oa_category ? this.pub.oa_category.id : -1)
      this.form.get('biblio_info').get('language').setValue(this.pub.language ? this.pub.language.id : -1)
      this.form.get('biblio_info').get('pub_type').setValue(this.pub.pub_type ? this.pub.pub_type.id : -1)
      if (this.pub.best_oa_license && !this.licenses.find(e => e === this.pub.best_oa_license)) this.form.get('oa_info').get('best_oa_license').setValue('Sonstige')

      if (this.pub?.locked) this.setLock(true);
      else {
        if (this.pub?.locked_author) this.form.get('author_info').disable();
        if (this.pub?.locked_biblio) this.form.get('biblio_info').disable();
        if (this.pub?.locked_oa) this.form.get('oa_info').disable();
        if (this.pub?.locked_finance) this.form.get('finance_info').disable();
      }
      if (this.pub.greater_entity) this.form.get('biblio_info').get('ge').setValue(this.pub.greater_entity.label)
      if (this.pub.publisher) this.form.get('biblio_info').get('publ').setValue(this.pub.publisher.label)
      if (this.pub.contract) this.form.get('finance_info').get('contr').setValue(this.pub.contract.label)

      if (this.pub.locked_at && (this.tokenService.hasRole('writer') || this.tokenService.hasRole('admin'))) {
        this.disable();
        this._snackBar.open('Publikation wird leider gerade durch einen anderen Nutzer bearbeitet', 'Ok.', {
          duration: 5000,
          panelClass: [`warning-snackbar`],
          verticalPosition: 'top'
        })
      } else if (!this.tokenService.hasRole('writer') && !this.tokenService.hasRole('admin')) {
        this.disable();
      }
      this.loading = false;
    }));
  }

  loadMasterData() {
    let ob$ = this.pubTypeService.getAll().pipe(map(data => {
      this.pub_types = data.sort((a, b) => a.label.localeCompare(b.label));
    }))
    ob$ = merge(ob$, this.oaService.getAll().pipe(map(data => {
      this.oa_categories = data.sort((a, b) => a.label.localeCompare(b.label));
    })))
    ob$ = merge(ob$, this.languageService.getAll().pipe(map(data => {
      this.langs = data.sort((a, b) => a.label.localeCompare(b.label));
    })))
    ob$ = merge(ob$, this.geService.getAll().pipe(map(data => {
      this.greater_entities = data.sort((a, b) => a.label.localeCompare(b.label));
      this.filtered_greater_entities = this.form.get('biblio_info').get('ge').valueChanges.pipe(
        startWith(this.pub?.greater_entity?.label),
        map(value => this._filterGE(value || '')),
      );
    })))
    ob$ = merge(ob$, this.publisherService.getAll().pipe(map(data => {
      this.publishers = data.sort((a, b) => a.label.localeCompare(b.label));
      this.filtered_publishers = this.form.get('biblio_info').get('publ').valueChanges.pipe(
        startWith(this.pub?.publisher?.label),
        map(value => this._filterPublisher(value || '')),
      );
    })))
    ob$ = merge(ob$, this.contractService.getAll().pipe(map(data => {
      this.contracts = data.sort((a, b) => a.label.localeCompare(b.label));
      this.filtered_contracts = this.form.get('finance_info').get('contr').valueChanges.pipe(
        startWith(this.pub?.contract?.label),
        map(value => this._filterContract(value || '')),
      );
    })))
    ob$ = merge(ob$, this.funderService.getAll().pipe(map(data => {
      this.funders = data.sort((a, b) => a.label.localeCompare(b.label));
      this.filteredFunders = this.form.get('finance_info').get('funder').valueChanges.pipe(
        startWith(''),
        //map(value => typeof value === 'string' ? value : value.name),
        map((name) => {
          return this._filterFunders(name);
        }));
    })))
    ob$ = merge(ob$, this.statusService.getAll().pipe(map(data => {
      this.statuses = data.sort((a, b) => a.label.localeCompare(b.label));
    })))
    return ob$;
  }

  ngAfterViewInit(): void {
  }

  disable() {
    this.disabled = true;
    this.form.disable();
    this.idForm.disable();
  }

  private _filterGE(value: string): GreaterEntity[] {
    const filterValue = value.toLowerCase();

    return this.greater_entities.filter(ge => ge?.label.toLowerCase().includes(filterValue) || ge?.identifiers.find(e => e.value.toLowerCase().includes(filterValue)));
  }
  private _filterPublisher(value: string): Publisher[] {
    const filterValue = value.toLowerCase();

    return this.publishers.filter(pub => pub?.label.toLowerCase().includes(filterValue));
  }
  private _filterContract(value: string): Contract[] {
    const filterValue = value.toLowerCase();

    return this.contracts.filter(pub => pub?.label.toLowerCase().includes(filterValue));
  }

  private _filterFunders(value) {
    if (!value) value = '';
    const filterValue = value.toLowerCase();
    return this.funders.filter(pub => pub?.label.toLowerCase().includes(filterValue));
  }

  addPublisher(event) {
    if (!event.value) return;
    if (!this.publishers.find(e => e.label === event.value)) {
      let dialogData = new ConfirmDialogModel("Neuer Verlag", `Möchten Sie den Verlag "${event.value}" anlegen?`);

      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        maxWidth: "400px",
        data: dialogData
      });

      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult) {
          let dialogRef1 = this.dialog.open(PublisherFormComponent, {
            width: "400px",
            data: {
              publisher: {
                label: event.value
              }
            }
          });
          dialogRef1.afterClosed().subscribe(dialogResult => {
            if (dialogResult) {
              this.publisherService.add(dialogResult).subscribe({
                next: data => {
                  this._snackBar.open('Verlag wurde hinzugefügt', 'Super!', {
                    duration: 5000,
                    panelClass: [`success-snackbar`],
                    verticalPosition: 'top'
                  })
                  this.pub.publisher = data[0];
                  this.form.get('biblio_info').get('publ').setValue(this.pub.publisher.label)
                  this.loadMasterData().subscribe();
                }
              })
            }
          });
        }
      });
    } else {
      let dialogRef = this.dialog.open(PublisherFormComponent, {
        width: "400px",
        data: {
          publisher: this.pub.publisher
        }
      });
      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult && dialogResult.label) {
          this.publisherService.update(dialogResult).subscribe({
            next: data => {
              this._snackBar.open('Verlag wurde geändert', 'Super!', {
                duration: 5000,
                panelClass: [`success-snackbar`],
                verticalPosition: 'top'
              })
              this.pub.publisher = data[0];
              this.form.get('biblio_info').get('publ').setValue(this.pub.publisher.label)
              this.loadMasterData().subscribe();
            }
          })
        } else if (dialogResult && dialogResult.id) {
          this.publisherService.update(dialogResult).subscribe();
        }
      });
    }
  }

  addContract(event) {
    if (!event.value) return;
    if (!this.contracts.find(e => e.label === event.value)) {
      let dialogData = new ConfirmDialogModel("Neuer Vertrag", `Möchten Sie den Vertrag "${event.value}" anlegen?`);

      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        maxWidth: "400px",
        data: dialogData
      });

      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult) {
          let dialogRef1 = this.dialog.open(ContractFormComponent, {
            width: "400px",
            data: {
              contract: {
                label: event.value
              }
            }
          });
          dialogRef1.afterClosed().subscribe(dialogResult => {
            if (dialogResult && dialogResult.label) {
              this.contractService.add(dialogResult).subscribe({
                next: data => {
                  this._snackBar.open('Vertrag wurde hinzugefügt', 'Super!', {
                    duration: 5000,
                    panelClass: [`success-snackbar`],
                    verticalPosition: 'top'
                  })
                  this.pub.contract = data[0];
                  this.form.get('finance_info').get('contr').setValue(this.pub.contract.label)
                  this.loadMasterData().subscribe();
                }
              })
            }
          });
        }
      });
    } else {
      let dialogRef = this.dialog.open(ContractFormComponent, {
        width: "400px",
        data: {
          contract: this.pub.contract
        }
      });
      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult && dialogResult.label) {
          this.contractService.update(dialogResult).subscribe({
            next: data => {
              this._snackBar.open('Vertrag wurde geändert', 'Super!', {
                duration: 5000,
                panelClass: [`success-snackbar`],
                verticalPosition: 'top'
              })
              this.pub.contract = data[0];
              this.form.get('finance_info').get('contr').setValue(this.pub.contract.label)
              this.loadMasterData().subscribe();
            }
          })
        } else if (dialogResult && dialogResult.id) {
          this.contractService.update(dialogResult).subscribe();
        }
      });
    }
  }

  addFunder(event) {
    if (!event.value) return;
    let funder = this.funders.find(e => e.label.toLocaleLowerCase() === event.value.toLocaleLowerCase());
    if (funder) this.pub.funders.push(funder);
    else {
      // new funder
      let dialogData = new ConfirmDialogModel("Förderer anlegen", `Möchten sSie Förderer "${event.value}" hinzufügen?`);

      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        maxWidth: "400px",
        data: dialogData
      });
      let value = event.value;

      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult) {
          this.funderService.add({ label: value }).subscribe({
            next: data => {
              this._snackBar.open('Förderer wurde hinzugefügt', 'Super!', {
                duration: 5000,
                panelClass: [`success-snackbar`],
                verticalPosition: 'top'
              })
              this.pub.funders.push(data[0])
              this.loadMasterData().subscribe();
            }
          })
        }
      })
    }
    this.funderInput.nativeElement.value = '';
    this.form.get('finance_info').get('funder').setValue('');
  }

  removeFunder(funder) {
    if (this.disabled) return;
    this.pub.funders = this.pub.funders.filter(ap => ap.id !== funder.id)
    this.form.get('finance_info').get('funder').setValue('');
  }

  addGreaterEntity(event) {
    if (!event.value) return;
    if (!this.greater_entities.find(e => e.label === event.value)) {
      let dialogData = new ConfirmDialogModel("Neue Größere Einheit", `Möchten Sie die Größere Einheit "${event.value}" anlegen?`);

      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        maxWidth: "400px",
        data: dialogData
      });

      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult) {
          let dialogRef1 = this.dialog.open(GreaterEntityFormComponent, {
            width: "400px",
            data: {
              greater_entity: {
                label: event.value
              }
            }
          });
          dialogRef1.afterClosed().subscribe(dialogResult => {
            if (dialogResult) {
              this.geService.add(dialogResult).subscribe({
                next: data => {
                  this._snackBar.open('Größere Einheit wurde hinzugefügt', 'Super!', {
                    duration: 5000,
                    panelClass: [`success-snackbar`],
                    verticalPosition: 'top'
                  })
                  this.pub.greater_entity = data[0];
                  this.form.get('biblio_info').get('ge').setValue(this.pub.greater_entity.label)
                  this.loadMasterData().subscribe();
                }
              })
            }
          });
        }
      });
    } else {
      let dialogRef = this.dialog.open(GreaterEntityFormComponent, {
        width: "400px",
        data: {
          greater_entity: this.pub.greater_entity
        }
      });
      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult && dialogResult.label) {
          this.geService.update(dialogResult).subscribe({
            next: data => {
              this._snackBar.open('Größere Einheit wurde geändert', 'Super!', {
                duration: 5000,
                panelClass: [`success-snackbar`],
                verticalPosition: 'top'
              })
              this.pub.greater_entity = data[0];
              this.form.get('biblio_info').get('ge').setValue(this.pub.greater_entity.label)
              this.loadMasterData().subscribe();
            }
          })
        } else if (dialogResult && dialogResult.id) {
          this.geService.update(dialogResult).subscribe();
        }
      });
    }
  }

  selectedGE(event: MatAutocompleteSelectedEvent): void {
    this.pub.greater_entity = this.greater_entities.find(e => e.label.trim().toLowerCase() === event.option.value.trim().toLowerCase());
    this.form.get('biblio_info').get('ge').setValue(this.pub.greater_entity.label)
  }
  selectedPubl(event: MatAutocompleteSelectedEvent): void {
    this.pub.publisher = this.publishers.find(e => e.label.trim().toLowerCase() === event.option.value.trim().toLowerCase());
    this.form.get('biblio_info').get('publ').setValue(this.pub.publisher.label)
  }
  selectedContr(event: MatAutocompleteSelectedEvent): void {
    this.pub.contract = this.contracts.find(e => e.label.trim().toLowerCase() === event.option.value.trim().toLowerCase());
    this.form.get('finance_info').get('contr').setValue(this.pub.contract.label)
  }
  selectedFunder(event: MatAutocompleteSelectedEvent): void {
    this.addFunder({ value: event.option.value })
  }

  close() {
    this.dialogRef.close(null)
  }

  abort(): void {
    if (this.form.dirty) {
      let dialogData = new ConfirmDialogModel("Ungesicherte Änderungen", `Es gibt ungespeicherte Änderungen, möchten Sie diese zunächst speichern?`);

      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        maxWidth: "400px",
        data: dialogData
      });

      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult) { //save
          this.action();
        } else if (this.pub.id) this.dialogRef.close({ id: this.pub.id, locked_at: null })
        else this.close()
      });
    } else if (this.pub.id) this.dialogRef.close({ id: this.pub.id, locked_at: null })
    else this.close()
  }

  action(): void {
    this.submitted = true;
    if (this.form.invalid) return;

    if (!this.form.get('biblio_info').get('ge').value) this.pub.greater_entity = null;
    if (!this.form.get('biblio_info').get('publ').value) this.pub.publisher = null;
    if (!this.form.get('finance_info').get('contr').value) this.pub.contract = null;

    let formValue = {
      ...this.form.get('author_info').getRawValue(),
      ...this.form.get('biblio_info').getRawValue(),
      ...this.form.get('oa_info').getRawValue(),
      ...this.form.get('finance_info').getRawValue(),
      id: this.form.get('id').getRawValue(),
      title: this.form.get('title').getRawValue(),
      doi: this.form.get('doi').getRawValue(),
      link: this.form.get('link').getRawValue(),
      add_info: this.form.get('add_info').getRawValue(),
      dataSource: this.form.get('dataSource').getRawValue(),
      status: this.form.get('status').getRawValue(),
    }

    if (this.edit) {
      this.pub = { ...this.pub, ...formValue, locked_at: null };
    } else { //new publication
      this.pub = {
        ...this.pub, ...formValue,
        dataSource: this.form.get('dataSource').value || 'Manuell hinzugefügt',
        pub_date: this.form.get('biblio_info').get('pub_date').value ? this.form.get('biblio_info').get('pub_date').value.format() : undefined,
        pub_date_print: this.form.get('biblio_info').get('pub_date_print').value ? this.form.get('biblio_info').get('pub_date_print').value.format() : undefined,
        pub_date_accepted: this.form.get('biblio_info').get('pub_date_accepted').value ? this.form.get('biblio_info').get('pub_date_accepted').value.format() : undefined,
        pub_date_submitted: this.form.get('biblio_info').get('pub_date_submitted').value ? this.form.get('biblio_info').get('pub_date_submitted').value.format() : undefined,
      }
      for (let key of Object.keys(this.pub)) {
        if (!this.pub[key]) this.pub[key] = undefined;
      }
    }
    this.pub.pub_type = this.form.get('biblio_info').get('pub_type').value !== -1 ? this.pub_types.find(e => e.id === this.form.get('biblio_info').get('pub_type').value) : null;
    this.pub.oa_category = this.form.get('oa_info').get('oa_cat').value !== -1 ? this.oa_categories.find(e => e.id === this.form.get('oa_info').get('oa_cat').value) : null;
    this.pub.language = this.form.get('biblio_info').get('language').value !== -1 ? this.oa_categories.find(e => e.id === this.form.get('biblio_info').get('language').value) : null;
    this.dialogRef.close(this.pub);
  }

  getAuthorInfo() {
    if (this.pub?.authorPublications) return this.pub.authorPublications.length + " " + this.institution + " Person(en)";
    else return "kein(e) " + this.institution + " Person(en)";
  }

  enter(event) {
    if (event.keyCode == 13 && event.srcElement.localName !== 'textarea') return false;
    return true;
  }

  escape(event) {
    if (event.key === 'Escape') {
      this.abort();
      return false;
    }
    return true;
  }

  lock(area?: string) {
    if (this.disabled) return;
    if (area === 'author') {
      this.pub.locked_author = !this.pub.locked_author;
      if (this.pub.locked_author) this.form.get('author_info').disable();
      else this.form.get('author_info').enable();
    } else if (area === 'biblio') {
      this.pub.locked_biblio = !this.pub.locked_biblio;
      if (this.pub.locked_biblio) this.form.get('biblio_info').disable();
      else this.form.get('biblio_info').enable();
    } else if (area === 'oa') {
      this.pub.locked_oa = !this.pub.locked_oa;
      if (this.pub.locked_oa) this.form.get('oa_info').disable();
      else this.form.get('oa_info').enable();
    } else if (area === 'finance') {
      this.pub.locked_finance = !this.pub.locked_finance;
      if (this.pub.locked_finance) this.form.get('finance_info').disable();
      else this.form.get('finance_info').enable();
    } else {
      this.pub.locked = !this.pub.locked;
      this.setLock(this.pub.locked)
    }
  }

  setLock(flag: boolean) {
    if (flag) {
      this.form.disable();
      if (!this.pub.locked_author) this.pub.locked_author = true;
      if (!this.pub.locked_biblio) this.pub.locked_biblio = true;
      if (!this.pub.locked_oa) this.pub.locked_oa = true;
      if (!this.pub.locked_finance) this.pub.locked_finance = true;
    } else {
      this.form.enable();
      if (this.pub.locked_author) this.form.get('author_info').disable();
      if (this.pub.locked_biblio) this.form.get('biblio_info').disable();
      if (this.pub.locked_oa) this.form.get('oa_info').disable();
      if (this.pub.locked_finance) this.form.get('finance_info').disable();
    }
  }

  getCosts(invoice: Invoice) {
    if (!invoice) return '';
    if (invoice.booking_amount) return invoice.booking_amount;
    else {
      if (!invoice.cost_items) return '';
      let sum = 0;
      for (let ci of invoice.cost_items) sum += ci.euro_value;
      return sum;
    }
  }

  deleteInvoice(elem) {
    this.pub.invoices = this.pub.invoices.filter(e => e.id !== elem.id)
  }

  addInvoice(invoice?: Invoice) {
    let dialogRef = this.dialog.open(InvoiceFormComponent, {
      maxWidth: "850px",
      data: {
        invoice
      }
    });
    dialogRef.afterClosed().subscribe({
      next: data => {
        if (data && data.cost_items) {
          this.pub.invoices = this.pub.invoices.filter(e => e.id !== data.id)
          this.pub.invoices.push(data)
          if (this.table) this.table.dataSource = new MatTableDataSource<Invoice>(this.pub.invoices);
        } else if (data && data.id) {
          this.invoiceService.update(data).subscribe();
        }
      }
    });
  }

  restore() {
    this.pub.delete_date = null;
    this.form.get('delete_date').setValue(null)
  }

  deleteAuthorship(elem) {
    if (this.disabled) return;
    this.pub.authorPublications = this.pub.authorPublications.filter(e => e.authorId !== elem.authorId)
  }
  addAuthorship(authorPub?) {
    if (this.disabled) return;
    let data = {};
    if (authorPub) data = { authorPub, authors: this.pub.authorPublications.filter(e => e.authorId !== authorPub.authorId).map(e => e.authorId) }
    else data = { authors: this.pub.authorPublications.map(e => e.authorId) }
    let dialogRef = this.dialog.open(AuthorshipFormComponent, {
      minWidth: "450px",
      data
    });
    dialogRef.afterClosed().subscribe({
      next: data => {
        if (data.authorId) {
          if (authorPub) this.pub.authorPublications = this.pub.authorPublications.filter(e => e.authorId !== authorPub.authorId)
          //this.pub.authorPublications.push(data)
          //if (this.table) this.table.dataSource = new MatTableDataSource<AuthorPublication>(this.pub.authorPublications);
          this.pub.authorPublications = this.pub.authorPublications.concat([data])
        }
      }
    });
  }

  deleteId(elem) {
    if (this.disabled) return;
    this.pub.identifiers = this.pub.identifiers.filter(e => e.id !== elem.id)
  }
  addId() {
    if (this.disabled || this.idForm.invalid) return;
    this.pub.identifiers.push({
      type: this.idForm.get('type').value,
      value: this.idForm.get('value').value
    })
    this.idForm.reset();
    if (this.tableId) this.tableId.dataSource = new MatTableDataSource<PublicationIdentifier>(this.pub.identifiers);
  }

  showStatusLabel(long:boolean) {
    let value = this.statuses?.find(e => e.id == this.form.get('status').value)?.label
    if (!value) return "";
    if (long) return value
    else {
     if (value.length>27) return value.slice(0,27)+"...";
     else return value;
    }
  }
}
