import { AfterViewInit, Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { Observable, map, startWith } from 'rxjs';
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
import { SelectInstituteDialogComponent } from 'src/app/tools/select-institute-dialog/select-institute-dialog.component';
import { Author, AuthorPublication, Contract, Funder, GreaterEntity, Institute, Invoice, Language, OA_Category, Publication, PublicationType, Publisher } from '../../../../../../output-interfaces/Publication';
import { ContractFormComponent } from '../contract-form/contract-form.component';
import { GreaterEntityFormComponent } from '../greater-entity-form/greater-entity-form.component';
import { InvoiceFormComponent } from '../invoice-form/invoice-form.component';
import { PublisherFormComponent } from '../publisher-form/publisher-form.component';
import { environment } from 'src/environments/environment';

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

  pub_type;
  oa_cat;
  language;

  authors: Author[];
  filteredAuthors: Observable<Author[]>;

  funders: Funder[];
  filteredFunders: Observable<Funder[]>;

  displayedColumns: string[] = ['date', 'costs', 'edit', 'delete'];

  @ViewChild('funderInput') funderInput: ElementRef<HTMLInputElement>;
  @ViewChild('authorInput') authorInput: ElementRef<HTMLInputElement>;
  @ViewChild(MatTable) table: MatTable<Invoice>;

  today = new Date();

  constructor(public dialogRef: MatDialogRef<PublicationFormComponent>, public tokenService: AuthorizationService, 
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private publicationService: PublicationService,
    private dialog: MatDialog, private pubTypeService: PublicationTypeService, private authorService: AuthorService, private _snackBar: MatSnackBar,
    private oaService: OACategoryService, private geService: GreaterEntityService, private publisherService: PublisherService, private contractService: ContractService,
    private funderService: FunderService, private languageService:LanguageService) {
    this.form = this.formBuilder.group({
      id: [''],
      title: ['', [Validators.required]],
      doi: [''],
      link: [''],
      pub_date: ['', [Validators.required]],
      language: [''],
      authors: ['', [Validators.required]],
      authors_inst: [''],
      add_info: [''],
      import_date: [''],
      edit_date: [''],
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
      funder: ['']
    });
    this.form.controls.id.disable();
    this.loading = true;
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    if (!this.tokenService.hasRole('writer')) {
      this.form.disable();
      this.authorInput.nativeElement.disabled = true;
      this.funderInput.nativeElement.disabled = true;
    }
    if (this.data['id']) {
      this.publicationService.getPublication(this.data['id']).subscribe({
        next: data => {
          this.edit = true;
          this.pub = data;
          this.form.patchValue(data);
          this.pub_type = this.pub.pub_type ? this.pub.pub_type.id : -1;
          this.oa_cat = this.pub.oa_category ? this.pub.oa_category.id : -1;
          this.language = this.pub.language ? this.pub.language.id : -1;
          if (this.pub.greater_entity) this.form.get('ge').setValue(this.pub.greater_entity.label)
          if (this.pub.publisher) this.form.get('publ').setValue(this.pub.publisher.label)
          if (this.pub.contract) this.form.get('contr').setValue(this.pub.contract.label)
          if (this.pub?.locked) this.setLock(true);
          this.loading = false;
        }
      })
    } else { //adding new publication
      this.edit = false;
      this.pub = {
        authorPublications: []
      };
      this.loading = false;
    }
    this.pubTypeService.getPubTypes().subscribe({
      next: data => {
        this.pub_types = data.sort((a, b) => a.label.localeCompare(b.label));
      }
    })
    this.oaService.getOACategories().subscribe({
      next: data => {
        this.oa_categories = data.sort((a, b) => a.label.localeCompare(b.label));
      }
    })
    this.geService.getGreaterEntities().subscribe({
      next: data => {
        this.greater_entities = data.sort((a, b) => a.label.localeCompare(b.label));
        this.filtered_greater_entities = this.form.get('ge').valueChanges.pipe(
          startWith(this.pub?.greater_entity?.label),
          map(value => this._filterGE(value || '')),
        );
      }
    })
    this.publisherService.getPublishers().subscribe({
      next: data => {
        this.publishers = data.sort((a, b) => a.label.localeCompare(b.label));
        this.filtered_publishers = this.form.get('publ').valueChanges.pipe(
          startWith(this.pub?.publisher?.label),
          map(value => this._filterPublisher(value || '')),
        );
      }
    })
    this.contractService.getContracts().subscribe({
      next: data => {
        this.contracts = data.sort((a, b) => a.label.localeCompare(b.label));
        this.filtered_contracts = this.form.get('contr').valueChanges.pipe(
          startWith(this.pub?.contract?.label),
          map(value => this._filterContract(value || '')),
        );
      }
    })
    this.authorService.getAuthors().subscribe({
      next: data => {
        this.authors = data.sort((a, b) => (a.last_name + ', ' + a.first_name).localeCompare(b.last_name + ', ' + b.first_name));
        this.filteredAuthors = this.form.get('authors_inst').valueChanges.pipe(
          startWith(''),
          //map(value => typeof value === 'string' ? value : value.name),
          map((name) => {
            return name ? this._filter(name) : this.authors.filter(author => !this.pub?.authorPublications.find(e => e.author.last_name === author.last_name));
          }));
      }
    })
    this.funderService.getFunders().subscribe({
      next: data => {
        this.funders = data.sort((a, b) => a.label.localeCompare(b.label));
        this.filteredFunders = this.form.get('funder').valueChanges.pipe(
          startWith(''),
          //map(value => typeof value === 'string' ? value : value.name),
          map((name) => {
            return this._filterFunders(name);
          }));
      }
    })
    this.languageService.getLanguages().subscribe({
      next: data => {
        this.langs = data.sort((a, b) => a.label.localeCompare(b.label));
      }
    })
  }

  private _filter(value) {
    let filterValue = value.toLowerCase();
    let split = filterValue.split(',').map(e => e.trim());
    if (split.length === 1) {
      return this.authors.filter(author => author.last_name.toLowerCase().includes(filterValue) && !this.pub.authorPublications.find(e => e.author.last_name === author.last_name) ||
        (author.orcid && author.orcid.includes(filterValue) && !this.pub.authorPublications.find(e => e.author.orcid === author.orcid)));
    } else return this.authors.filter(author => author.last_name.toLowerCase() === split[0] && author.first_name.toLowerCase().includes(split[1]) && !this.pub.authorPublications.find(e => e.author.last_name === author.last_name));
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

  selectInstitute(author: Author): Observable<Institute> {
    let dialogRef = this.dialog.open(SelectInstituteDialogComponent, {
      maxWidth: "400px",
      data: {
        author,
        authorPub: this.pub.authorPublications.find(e => e.author.id === author.id)
      }
    });
    return dialogRef.afterClosed();
  }

  editInst(authorPub: AuthorPublication) {
    if (this.pub.locked || !this.tokenService.hasRole('writer')) return;
    this.selectInstitute(authorPub.author).subscribe({
      next: data => {
        if (data === null || data.id) authorPub.institute = data;
      }
    })
  }

  addAuthor(event) {
    if (!event.value || !this.tokenService.hasRole('writer')) return;
    let split = event.value.toLocaleLowerCase().split(',').map(e => e.trim());
    if (split.length > 1) {
      let author = this.authors.find(e => e.last_name.toLocaleLowerCase() === split[0] && e.first_name.toLocaleLowerCase() === split[1]);
      if (author && this.pub.id) { //pub edit and author existing
        //open institute selection dialog
        this.selectInstitute(author).subscribe(dialogResult => {
          this.pub.authorPublications.push({ author, authorId: author.id, publicationId: this.pub.id, institute: dialogResult })
        });
      } else if (author && !this.pub.id) { //pub new and author existing
        //open institute selection dialog
        this.selectInstitute(author).subscribe(dialogResult => {
          this.pub.authorPublications.push({ author, authorId: author.id, institute: dialogResult })
        });
      } else { // new author
        let dialogData = new ConfirmDialogModel("Autor*in anlegen", `Möchten Sie Autor*in "${event.value}" hinzufügen?`);

        let dialogRef = this.dialog.open(ConfirmDialogComponent, {
          maxWidth: "400px",
          data: dialogData
        });
        let value = event.value;

        dialogRef.afterClosed().subscribe(dialogResult => {
          if (dialogResult) {
            this.authorService.addAuthor({ last_name: value.split(',')[0].trim(), first_name: value.split(',')[1].trim() }).subscribe({
              next: data => {
                this._snackBar.open('Autor*in wurde hinzugefügt', 'Super!', {
                  duration: 5000,
                  panelClass: [`success-snackbar`],
                  verticalPosition: 'top'
                })
                if (this.pub.id) this.pub.authorPublications.push({ author: data, authorId: data.id, publicationId: this.pub.id })
                else this.pub.authorPublications.push({ author, authorId: author.id })
                this.form.get('authors_inst').setValue('');
                this.ngAfterViewInit();
              }
            })
          }
        })
      }
    }
    this.authorInput.nativeElement.value = '';
    this.form.get('authors_inst').setValue('');
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
            height: "800px",
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
                  this.ngAfterViewInit();
                }
              })
            }
          });
        } else this.form.get('publ').enable();
      });
    } else {
      let dialogRef = this.dialog.open(PublisherFormComponent, {
        width: "400px",
        height: "800px",
        data: {
          publisher: this.pub.publisher
        }
      });
      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult) {
          this.publisherService.update(dialogResult).subscribe({
            next: data => {
              this._snackBar.open('Verlag wurde geändert', 'Super!', {
                duration: 5000,
                panelClass: [`success-snackbar`],
                verticalPosition: 'top'
              })
              this.pub.publisher = data[0];
              this.form.get('publ').setValue(this.pub.publisher.label)
              this.ngAfterViewInit();
            }
          })
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
            height: "800px",
            data: {
              contract: {
                label: event.value
              }
            }
          });
          dialogRef1.afterClosed().subscribe(dialogResult => {
            this.form.get('contr').enable();
            if (dialogResult) {
              this.contractService.insert(dialogResult).subscribe({
                next: data => {
                  this._snackBar.open('Vertrag wurde hinzugefügt', 'Super!', {
                    duration: 5000,
                    panelClass: [`success-snackbar`],
                    verticalPosition: 'top'
                  })
                  this.pub.contract = data[0];
                  this.form.get('contr').setValue(this.pub.contract.label)
                  this.ngAfterViewInit();
                }
              })
            }
          });
        } else this.form.get('contr').enable();
      });
    } else {
      let dialogRef = this.dialog.open(ContractFormComponent, {
        width: "400px",
        height: "800px",
        data: {
          contract: this.pub.contract
        }
      });
      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult) {
          this.contractService.update(dialogResult).subscribe({
            next: data => {
              this._snackBar.open('Vertrag wurde geändert', 'Super!', {
                duration: 5000,
                panelClass: [`success-snackbar`],
                verticalPosition: 'top'
              })
              this.pub.contract = data[0];
              this.form.get('contr').setValue(this.pub.contract.label)
              this.ngAfterViewInit();
            }
          })
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
      let dialogData = new ConfirmDialogModel("Förderer anlegen", `Möchten Sie Förderer "${event.value}" hinzufügen?`);

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
              this.ngAfterViewInit();
            }
          })
        }
      })
    }
    this.funderInput.nativeElement.value = '';
    this.form.get('funder').setValue('');
  }

  removeFunder(funder) {
    if (!this.tokenService.hasRole('writer')) return;
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
            height: "800px",
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
                  this.ngAfterViewInit();
                }
              })
            }
          });
        } else this.form.get('ge').enable();
      });
    } else {
      let dialogRef = this.dialog.open(GreaterEntityFormComponent, {
        width: "400px",
        height: "800px",
        data: {
          greater_entity: this.pub.greater_entity
        }
      });
      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult) {
          this.geService.update(dialogResult).subscribe({
            next: data => {
              this._snackBar.open('Größere Einheit wurde geändert', 'Super!', {
                duration: 5000,
                panelClass: [`success-snackbar`],
                verticalPosition: 'top'
              })
              this.pub.greater_entity = data[0];
              this.form.get('ge').setValue(this.pub.greater_entity.label)
              this.ngAfterViewInit();
            }
          })
        }
        this.form.get('ge').enable();
      });
    }
  }

  removeAuthor(author) {
    if (!this.tokenService.hasRole('writer')) return;
    this.pub.authorPublications = this.pub.authorPublications.filter(ap => ap.author.id !== author.id)
    this.form.get('authors_inst').setValue('');
  }

  switchCorresponding(authorPub: AuthorPublication) {
    if (this.pub.locked || !this.tokenService.hasRole('writer')) return;
    this.pub.authorPublications = this.pub.authorPublications.filter(e => !(e.authorId === authorPub.authorId && e.publicationId === authorPub.publicationId))
    this.pub.authorPublications.push({
      authorId: authorPub.authorId,
      author: authorPub.author,
      publicationId: authorPub.publicationId,
      corresponding: !authorPub.corresponding,
      institute: authorPub.institute
    })
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    this.addAuthor({ value: event.option.value })
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

  abort(): void {
    if (this.form.dirty && !this.tokenService.hasRole('writer')) {
      let dialogData = new ConfirmDialogModel("Ungesicherte Änderungen", `Es gibt ungespeicherte Änderungen, möchten Sie diese zunächst speichern?`);

      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        maxWidth: "400px",
        data: dialogData
      });

      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult) {
          this.dialogRef.close(this.pub);
        } else this.dialogRef.close(null)
      });
    } else this.dialogRef.close(null)
  }

  action(): void {
    this.submitted = true;
    if (this.form.invalid) return;
    if (!this.form.get('ge').value) this.pub.greater_entity = null;
    if (!this.form.get('publ').value) this.pub.publisher = null;
    if (!this.form.get('contr').value) this.pub.contract = null;

    if (this.edit) {
      this.pub = { ...this.pub, ...this.form.getRawValue() };
    } else { //new publication
      this.pub = {
        ...this.pub,
        title: this.form.get('title').value,
        authors: this.form.get('authors').value,
        dataSource: this.form.get('dataSource').value || 'Manuell hinzugefügt',
        pub_date: this.form.get('pub_date').value.format(),
      }
    }
    this.pub.pub_type = this.pub_type !== -1 ? this.pub_types.find(e => e.id === this.pub_type) : null;
    this.pub.oa_category = this.oa_cat !== -1 ? this.oa_categories.find(e => e.id === this.oa_cat) : null;
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
    if (!this.tokenService.hasRole('writer')) return;
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

  getCosts(invoice:Invoice) {
    if (!invoice) return '';
    if (invoice.booking_amount) return invoice.booking_amount;
    else {
      if (!invoice.cost_items) return '';
      let sum = 0;
      for (let ci of invoice.cost_items) sum+=ci.euro_value;
      return sum;
    }
  }
  deleteInvoice(elem) {
    this.pub.invoices = this.pub.invoices.filter(e => e.id !== elem.id)
  }
  addInvoice(invoice?:Invoice) {
    let dialogRef = this.dialog.open(InvoiceFormComponent, {
      maxWidth: "650px",
      data: {
        invoice
      }
    });
    dialogRef.afterClosed().subscribe({
      next: data => {
        if (!data) return;
        this.pub.invoices = this.pub.invoices.filter(e => e.id !== data.id)
        this.pub.invoices.push(data)
        this.table.dataSource = new MatTableDataSource<Invoice>(this.pub.invoices);
      }
    });
  }
}
