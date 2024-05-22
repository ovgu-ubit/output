import { AfterViewInit, Component, ElementRef, Inject, Injectable, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { EMPTY, Observable, concatWith, map, merge, startWith } from 'rxjs';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { AuthorService } from 'src/app/services/entities/author.service';
import { ContractService } from 'src/app/services/entities/contract.service';
import { FunderService } from 'src/app/services/entities/funder.service';
import { GreaterEntityService } from 'src/app/services/entities/greater-entity.service';
import { LanguageService } from 'src/app/services/entities/language.service';
import { OACategoryService } from 'src/app/services/entities/oa-category.service';
import { PublicationTypeService } from 'src/app/services/entities/publication-type.service';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';
import { Author, AuthorPublication, Contract, Funder, GreaterEntity, Institute, Invoice, Language, OA_Category, Publication, PublicationType, Publisher } from '../../../../../../output-interfaces/Publication';
import { ContractFormComponent } from '../contract-form/contract-form.component';
import { GreaterEntityFormComponent } from '../greater-entity-form/greater-entity-form.component';
import { InvoiceFormComponent } from '../invoice-form/invoice-form.component';
import { PublisherFormComponent } from '../publisher-form/publisher-form.component';
import { environment } from 'src/environments/environment';
import { InvoiceService } from 'src/app/services/entities/invoice.service';
import { AuthorshipFormComponent } from '../authorship-form/authorship-form.component';

@Injectable({ providedIn: 'root' })
export class PubDateValidator {
  public pubDateValidator(): ValidatorFn {
    return (formGroup: FormGroup) => {
      if (formGroup.get('pub_date').value || formGroup.get('pub_date_print').value || formGroup.get('pub_date_accepted').value || formGroup.get('pub_date_submitted').value) return null;
      else return { no_pub_date: true }
    };
  }
}

@Component({
  selector: 'app-publication-form',
  templateUrl: './publication-form.component.html',
  styleUrls: ['./publication-form.component.css']
})
export class PublicationFormComponent implements OnInit, AfterViewInit {
  public form: FormGroup;
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

  pub_type_id;
  oa_cat_id;
  language_id;

  funders: Funder[];
  filteredFunders: Observable<Funder[]>;

  displayedColumns: string[] = ['date', 'costs', 'edit', 'delete'];
  displayedColumnsAuthors: string[] = ['edit', 'name', 'corr', 'institute', 'role', 'delete'];

  @ViewChild('funderInput') funderInput: ElementRef<HTMLInputElement>;
  @ViewChild(MatTable) table: MatTable<Invoice>;
  @ViewChild('table') tableAuthors: MatTable<AuthorPublication>;

  today = new Date();
  disabled = false;
  licenses = ['cc-by', 'cc-by-nc', 'cc-by-nd', 'cc-by-sa', 'cc-by-nc-nd', 'cc-by-nc-sa', 'Sonstige']
  optional_fields;

  constructor(public dialogRef: MatDialogRef<PublicationFormComponent>, public tokenService: AuthorizationService, private pubValidator: PubDateValidator,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private publicationService: PublicationService,
    private dialog: MatDialog, private pubTypeService: PublicationTypeService, private authorService: AuthorService, private _snackBar: MatSnackBar,
    private oaService: OACategoryService, private geService: GreaterEntityService, private publisherService: PublisherService, private contractService: ContractService,
    private funderService: FunderService, private languageService: LanguageService, private invoiceService: InvoiceService) {
    this.form = this.formBuilder.group({
      id: [''],
      title: ['', [Validators.required]],
      doi: [''],
      link: [''],
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
      authors: ['', [Validators.required]],
      page_count: [''],
      peer_reviewed: [''],
      add_info: [''],
      import_date: [''],
      edit_date: [''],
      delete_date: [''],
      dataSource: [''],
      second_pub: [''],
      status: [''],
      is_oa: [''],
      oa_status: [''],
      is_journal_oa: [''],
      best_oa_host: [''],
      best_oa_license: [''],
      ge: [''],
      publ: [''],
      contr: [''],
      funder: [''],
      pub_type: [''],
      oa_cat: ['']
    }, {
      validators: [this.pubValidator.pubDateValidator()]
    });
    this.form.controls.id.disable();
    this.form.controls.is_oa.disable();
    this.form.controls.oa_status.disable();
    this.form.controls.is_journal_oa.disable();
    this.form.controls.best_oa_host.disable();
  }

  ngOnInit(): void {
    let ob$ = this.publicationService.getOptionalFields().pipe(map(data => {
      this.optional_fields = data;
    }
    ));
    if (this.data['id']) {
      this.edit = true;
      this.loading = true;
      ob$ = merge(ob$, this.loadPub(this.data['id']));
    } else {
      this.edit = false;
      this.pub = {
        authorPublications: []
      };
    }
    ob$ = merge(ob$, this.loadMasterData());

    ob$.subscribe({
      complete: () => {
      }
    })
  }

  loadPub(id: number) {
    return this.publicationService.getPublication(id).pipe(map(data => {
      this.pub = data;
      this.form.patchValue(data);
      this.pub_type_id = this.pub.pub_type ? this.pub.pub_type.id : -1
      this.oa_cat_id = this.pub.oa_category ? this.pub.oa_category.id : -1
      this.language_id = this.pub.language ? this.pub.language.id : -1
      if (this.pub.best_oa_license && !this.licenses.find(e => e === this.pub.best_oa_license)) this.form.get('best_oa_license').setValue('Sonstige')

      if (this.pub?.locked) this.setLock(true);
      if (this.pub.greater_entity) this.form.get('ge').setValue(this.pub.greater_entity.label)
      if (this.pub.publisher) this.form.get('publ').setValue(this.pub.publisher.label)
      if (this.pub.contract) this.form.get('contr').setValue(this.pub.contract.label)

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
    let ob$ = this.pubTypeService.getPubTypes().pipe(map(data => {
      this.pub_types = data.sort((a, b) => a.label.localeCompare(b.label));
    }))
    ob$ = merge(ob$, this.oaService.getOACategories().pipe(map(data => {
      this.oa_categories = data.sort((a, b) => a.label.localeCompare(b.label));
    })))
    ob$ = merge(ob$, this.languageService.getLanguages().pipe(map(data => {
      this.langs = data.sort((a, b) => a.label.localeCompare(b.label));
    })))
    ob$ = merge(ob$, this.geService.getGreaterEntities().pipe(map(data => {
      this.greater_entities = data.sort((a, b) => a.label.localeCompare(b.label));
      this.filtered_greater_entities = this.form.get('ge').valueChanges.pipe(
        startWith(this.pub?.greater_entity?.label),
        map(value => this._filterGE(value || '')),
      );
    })))
    ob$ = merge(ob$, this.publisherService.getPublishers().pipe(map(data => {
      this.publishers = data.sort((a, b) => a.label.localeCompare(b.label));
      this.filtered_publishers = this.form.get('publ').valueChanges.pipe(
        startWith(this.pub?.publisher?.label),
        map(value => this._filterPublisher(value || '')),
      );
    })))
    ob$ = merge(ob$, this.contractService.getContracts().pipe(map(data => {
      this.contracts = data.sort((a, b) => a.label.localeCompare(b.label));
      this.filtered_contracts = this.form.get('contr').valueChanges.pipe(
        startWith(this.pub?.contract?.label),
        map(value => this._filterContract(value || '')),
      );
    })))
    ob$ = merge(ob$, this.funderService.getFunders().pipe(map(data => {
      this.funders = data.sort((a, b) => a.label.localeCompare(b.label));
      this.filteredFunders = this.form.get('funder').valueChanges.pipe(
        startWith(''),
        //map(value => typeof value === 'string' ? value : value.name),
        map((name) => {
          return this._filterFunders(name);
        }));
    })))
    return ob$;
  }

  ngAfterViewInit(): void {
  }

  disable() {
    this.disabled = true;
    this.form.disable();
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
    this.form.get('publ').disable();
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
            this.form.get('publ').enable();
            if (dialogResult) {
              this.publisherService.insert(dialogResult).subscribe({
                next: data => {
                  this._snackBar.open('Verlag wurde hinzugefügt', 'Super!', {
                    duration: 5000,
                    panelClass: [`success-snackbar`],
                    verticalPosition: 'top'
                  })
                  this.pub.publisher = data[0];
                  this.form.get('publ').setValue(this.pub.publisher.label)
                  this.loadMasterData().subscribe();
                }
              })
            }
          });
        } else this.form.get('publ').enable();
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
              this.form.get('publ').setValue(this.pub.publisher.label)
              this.loadMasterData().subscribe();
            }
          })
        } else if (dialogResult && dialogResult.id) {
          this.publisherService.update(dialogResult).subscribe();
        }
        this.form.get('publ').enable();
      });
    }
  }

  addContract(event) {
    if (!event.value) return;
    this.form.get('contr').disable();
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
            this.form.get('contr').enable();
            if (dialogResult && dialogResult.label) {
              this.contractService.insert(dialogResult).subscribe({
                next: data => {
                  this._snackBar.open('Vertrag wurde hinzugefügt', 'Super!', {
                    duration: 5000,
                    panelClass: [`success-snackbar`],
                    verticalPosition: 'top'
                  })
                  this.pub.contract = data[0];
                  this.form.get('contr').setValue(this.pub.contract.label)
                  this.loadMasterData().subscribe();
                }
              })
            }
          });
        } else this.form.get('contr').enable();
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
              this.form.get('contr').setValue(this.pub.contract.label)
              this.loadMasterData().subscribe();
            }
          })
        } else if (dialogResult && dialogResult.id) {
          this.contractService.update(dialogResult).subscribe();
        }
        this.form.get('contr').enable();
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
          this.funderService.insert({ label: value }).subscribe({
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
    this.form.get('funder').setValue('');
  }

  removeFunder(funder) {
    if (this.disabled) return;
    this.pub.funders = this.pub.funders.filter(ap => ap.id !== funder.id)
    this.form.get('funder').setValue('');
  }

  addGreaterEntity(event) {
    if (!event.value) return;
    this.form.get('ge').disable();
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
            this.form.get('ge').enable();
            if (dialogResult) {
              this.geService.insert(dialogResult).subscribe({
                next: data => {
                  this._snackBar.open('Größere Einheit wurde hinzugefügt', 'Super!', {
                    duration: 5000,
                    panelClass: [`success-snackbar`],
                    verticalPosition: 'top'
                  })
                  this.pub.greater_entity = data[0];
                  this.form.get('ge').setValue(this.pub.greater_entity.label)
                  this.loadMasterData().subscribe();
                }
              })
            }
          });
        } else this.form.get('ge').enable();
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
              this.form.get('ge').setValue(this.pub.greater_entity.label)
              this.loadMasterData().subscribe();
            }
          })
        } else if (dialogResult && dialogResult.id) {
          this.geService.update(dialogResult).subscribe();
        }
        this.form.get('ge').enable();
      });
    }
  }

  selectedGE(event: MatAutocompleteSelectedEvent): void {
    this.pub.greater_entity = this.greater_entities.find(e => e.label.trim().toLowerCase() === event.option.value.trim().toLowerCase());
    this.form.get('ge').setValue(this.pub.greater_entity.label)
  }
  selectedPubl(event: MatAutocompleteSelectedEvent): void {
    this.pub.publisher = this.publishers.find(e => e.label.trim().toLowerCase() === event.option.value.trim().toLowerCase());
    this.form.get('publ').setValue(this.pub.publisher.label)
  }
  selectedContr(event: MatAutocompleteSelectedEvent): void {
    this.pub.contract = this.contracts.find(e => e.label.trim().toLowerCase() === event.option.value.trim().toLowerCase());
    this.form.get('contr').setValue(this.pub.contract.label)
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

    if (!this.form.get('ge').value) this.pub.greater_entity = null;
    if (!this.form.get('publ').value) this.pub.publisher = null;
    if (!this.form.get('contr').value) this.pub.contract = null;

    if (this.edit) {
      this.pub = { ...this.pub, ...this.form.getRawValue(), locked_at: null };
    } else { //new publication
      this.pub = {
        ...this.pub, ...this.form.getRawValue(),
        dataSource: this.form.get('dataSource').value || 'Manuell hinzugefügt',
        pub_date: this.form.get('pub_date').value ? this.form.get('pub_date').value.format() : undefined,
        pub_date_print: this.form.get('pub_date_print').value ? this.form.get('pub_date_print').value.format() : undefined,
        pub_date_accepted: this.form.get('pub_date_accepted').value ? this.form.get('pub_date_accepted').value.format() : undefined,
        pub_date_submitted: this.form.get('pub_date_submitted').value ? this.form.get('pub_date_submitted').value.format() : undefined,
      }
      for (let key of Object.keys(this.pub)) {
        if (!this.pub[key]) this.pub[key] = undefined;
      }
    }
    this.pub.pub_type = this.pub_type_id !== -1 ? this.pub_types.find(e => e.id === this.pub_type_id) : null;
    this.pub.oa_category = this.oa_cat_id !== -1 ? this.oa_categories.find(e => e.id === this.oa_cat_id) : null;
    this.pub.language = this.language_id !== -1 ? this.langs.find(e => e.id === this.language_id) : null;
    this.dialogRef.close(this.pub);
  }

  getAuthorInfo() {
    if (this.pub?.authorPublications) return this.pub.authorPublications.length + " " + environment.institution + " Autor(en)";
    else return "kein(e) " + environment.institution + " Autor(en)";
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

  lock() {
    if (this.disabled) return;
    this.pub.locked = !this.pub.locked;
    this.setLock(this.pub.locked)
  }

  setLock(flag: boolean) {
    if (flag) {
      this.form.disable();
    } else {
      this.form.enable();
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
          this.table.dataSource = new MatTableDataSource<Invoice>(this.pub.invoices);
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
    else data = {authors: this.pub.authorPublications.map(e => e.authorId)}
    let dialogRef = this.dialog.open(AuthorshipFormComponent, {
      minWidth: "450px",
      data
    });
    dialogRef.afterClosed().subscribe({
      next: data => {
        if (data.authorId) {
          console.log(data)
          if (authorPub) this.pub.authorPublications = this.pub.authorPublications.filter(e => e.authorId !== authorPub.authorId)
          this.pub.authorPublications.push(data)
          if (this.table) this.table.dataSource = new MatTableDataSource(this.pub.authorPublications);
        }
      }
    });
  }
}
