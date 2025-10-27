import { AfterViewInit, Component, Inject, Injectable, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { concat, concatMap, delay, firstValueFrom, map, merge, of } from 'rxjs';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { ConfigService } from 'src/app/services/config.service';
import { ConfigService as ConfigService2} from 'src/app/administration/services/config.service';
import { EnrichService } from 'src/app/administration/services/enrich.service';
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
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/shared/confirm-dialog/confirm-dialog.component';
import { AuthorPublication, Invoice, Publication, PublicationSupplement, Status } from '../../../../../../output-interfaces/Publication';
import { PublisherFormComponent } from 'src/app/form/publisher-form/publisher-form.component';
import { ContractFormComponent } from 'src/app/form/contract-form/contract-form.component';
import { FunderFormComponent } from 'src/app/form/funder-form/funder-form.component';
import { GreaterEntityFormComponent } from 'src/app/form/greater-entity-form/greater-entity-form.component';
import { OaCategoryFormComponent } from 'src/app/form/oa-category-form/oa-category-form.component';
import { PubTypeFormComponent } from 'src/app/form/pub-type-form/pub-type-form.component';
import { DoiFormComponent } from 'src/app/form/doi-form/doi-form.component';
import { InvoiceFormComponent } from 'src/app/form/invoice-form/invoice-form.component';
import { AuthorshipFormComponent } from 'src/app/form/authorship-form/authorship-form.component';
import { IdTableComponent } from 'src/app/shared/id-table/id-table.component';

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
    styleUrls: ['./publication-form.component.css'],
    standalone: false
})
export class PublicationFormComponent implements OnInit, AfterViewInit {
  institution: string;
  public form: FormGroup;
  public supplForm: FormGroup;
  submitted = false;

  edit: boolean = false;
  loading: boolean;
  pub: Publication;

  doi_import_service: string;

  statuses: Status[];

  displayedColumns: string[] = ['date', 'costs', 'edit', 'delete'];
  displayedColumnsAuthors: string[] = ['edit', 'name', 'corr', 'institute', 'role', 'delete'];

  @ViewChild('tableInvoice') table: MatTable<Invoice>;
  @ViewChild('table') tableAuthors: MatTable<AuthorPublication>;
  @ViewChild(IdTableComponent) idTable: IdTableComponent<Publication>;
  @ViewChild('tableSuppl') supplTable: MatTable<PublicationSupplement>;

  today = new Date();
  disabled = false;
  licenses = ['cc-by', 'cc-by-nc', 'cc-by-nd', 'cc-by-sa', 'cc-by-nc-nd', 'cc-by-nc-sa', 'Sonstige']
  optional_fields;

  publisherForm = PublisherFormComponent;
  contractForm = ContractFormComponent;
  funderForm = FunderFormComponent;
  geForm = GreaterEntityFormComponent;
  oaForm = OaCategoryFormComponent;
  ptForm = PubTypeFormComponent;

  constructor(public dialogRef: MatDialogRef<PublicationFormComponent>, public tokenService: AuthorizationService, private pubValidator: PubValidator,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private publicationService: PublicationService,
    private dialog: MatDialog, public pubTypeService: PublicationTypeService, private _snackBar: MatSnackBar,
    public oaService: OACategoryService, public geService: GreaterEntityService, public publisherService: PublisherService, public contractService: ContractService,
    public funderService: FunderService, public languageService: LanguageService, private invoiceService: InvoiceService, private configService: ConfigService,
    private configService2: ConfigService2,
    private statusService: StatusService, private enrichService: EnrichService) {
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
        peer_reviewed: [''],
        pub_date: [''],
        pub_date_print: [''],
        pub_date_submitted: [''],
        pub_date_accepted: [''],
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
        second_pub: [''],
        is_oa: [''],
        oa_status: [''],
        is_journal_oa: [''],
        best_oa_host: [''],
        best_oa_license: [''],
      }),
      finance_info: this.formBuilder.group({
        cost_approach: [''],
        grant_number: [''],
        budget_relevant: [''],
        contract_year: ['']
      }),
    }, {
      validators: [this.pubValidator.pubValidator()]
    });
    this.form.get('id').disable();
    this.form.get('oa_info').get('is_oa').disable();
    this.form.get('oa_info').get('oa_status').disable();
    this.form.get('oa_info').get('is_journal_oa').disable();
    this.form.get('oa_info').get('best_oa_host').disable();

    this.supplForm = this.formBuilder.group({
      link: ['', Validators.required],
    })
  }

  ngOnInit(): void {
    let ob$ = this.configService.getOptionalFields().pipe(map(data => {
      this.optional_fields = data;
    }
    ));
    ob$ = merge(ob$, this.configService2.get("institution_short_label").pipe(map(data => {
      this.institution = data[0].values[0];
    }
    )));
    ob$ = merge(ob$, this.configService.getImportService().pipe(map(data => {
      this.doi_import_service = data;
    })))
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
      let dialogRef = this.dialog.open(DoiFormComponent, {
        width: '800px',
        maxHeight: '800px',
        data: {
        },
        disableClose: true
      });
      ob$ = concat(ob$, dialogRef.afterClosed().pipe(map(result => {
        if (!result) return;
        if (result.doi) {
          this.pub.doi = result.doi;
          this.pub.dataSource = 'Manuell per DOI hinzugefügt'
          this.publicationService.add(this.pub).pipe(concatMap(data => {
            if (!Array.isArray(data)) return of(null);
            this.pub.id = data[0].id
            /*this.filter = {
              filter: {
                expressions: [
                  {
                    op: JoinOperation.AND,
                    key: 'id',
                    comp: CompareOperation.EQUALS,
                    value: id[0]
                  }
                ]
              }
            }*/
            this.loading = true;
            return this.enrichService.startID(this.doi_import_service, [this.pub.id]).pipe(delay(2000))//wait for 2 seconds to complete enrich
          })).pipe(concatMap(data => {
            this.edit = true;
            return this.loadPub(this.pub.id);
          })).subscribe()
        }
      })));
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
      if (this.pub.best_oa_license && !this.licenses.find(e => e === this.pub.best_oa_license)) this.form.get('oa_info').get('best_oa_license').setValue('Sonstige')

      if (this.pub?.locked) this.setLock(true);
      else {
        if (this.pub?.locked_author) this.form.get('author_info').disable();
        if (this.pub?.locked_biblio) this.form.get('biblio_info').disable();
        if (this.pub?.locked_oa) this.form.get('oa_info').disable();
        if (this.pub?.locked_finance) this.form.get('finance_info').disable();
      }

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
    return this.statusService.getAll().pipe(map(data => {
      this.statuses = data.sort((a, b) => a.label.localeCompare(b.label));
    }))
  }

  ngAfterViewInit(): void {
  }

  disable() {
    this.disabled = true;
    this.form.disable();
  }

  setPublisher(event) {
    this.pub.publisher = event;
    this.form.markAsDirty()
  }

  setContract(event) {
    this.pub.contract = event;
    this.form.markAsDirty()
  }

  setFunder(event) {
    if (!this.pub.funders) this.pub.funders = [];
    this.pub.funders.push(event);
    this.form.markAsDirty()
  }

  removeFunder(funder) {
    if (this.disabled) return;
    this.pub.funders = this.pub.funders.filter(ap => ap.id !== funder.id)
    this.form.markAsDirty()
  }

  setGE(event) {
    this.pub.greater_entity = event;
    this.form.markAsDirty()
  }

  setOA(event) {
    this.pub.oa_category = event;
    this.form.markAsDirty()
  }

  setLang(event) {
    this.pub.language = event;
    this.form.markAsDirty()
  }

  setPubType(event) {
    this.pub.pub_type = event;
    this.form.markAsDirty()
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

  async action() {
    this.submitted = true;
    if (this.form.invalid) return;

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
    for (let key of Object.keys(this.pub)) {
      if (this.pub[key] === '') this.pub[key] = null;
    }
    if (this.idTable && this.idTable.isDirty()) {
      let dialogData = new ConfirmDialogModel("Ungesicherte Änderungen", `Es gibt einen ungespeicherten Identifier, möchten Sie diesen zunächst speichern?`);

      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        maxWidth: "400px",
        data: dialogData
      });

      let dialogResult = await firstValueFrom(dialogRef.afterClosed())
      if (dialogResult) { //save
        this.idTable.addId();
      }
    }

    this.dialogRef.close({ ...this.pub, updated: true });
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
    this.form.get('id').disable();
    this.form.get('oa_info').get('is_oa').disable();
    this.form.get('oa_info').get('oa_status').disable();
    this.form.get('oa_info').get('is_journal_oa').disable();
    this.form.get('oa_info').get('best_oa_host').disable();
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
      this.form.get('id').disable();
      this.form.get('oa_info').get('is_oa').disable();
      this.form.get('oa_info').get('oa_status').disable();
      this.form.get('oa_info').get('is_journal_oa').disable();
      this.form.get('oa_info').get('best_oa_host').disable();
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
    if (elem.id) this.pub.invoices = this.pub.invoices.filter(e => e.id !== elem.id)
    else this.pub.invoices = this.pub.invoices.filter(e => e !== elem)
  }

  addInvoice(invoice?: Invoice) {
    if (!this.pub.invoices) this.pub.invoices = [];
    let dialogRef = this.dialog.open(InvoiceFormComponent, {
      width: "800px",
      data: {
        entity: invoice,
        locked: this.pub.locked || this.pub.locked_finance || this.disabled
      },
      disableClose: true
    });
    if (invoice && !invoice.id) this.pub.invoices = this.pub.invoices.filter(e => e !== invoice)
    dialogRef.afterClosed().subscribe({
      next: data => {
        if (data && data.updated) {
          if (invoice?.id) this.pub.invoices = this.pub.invoices.filter(e => e.id !== data.id)
          this.pub.invoices.push(data)
          if (this.table) this.table.dataSource = new MatTableDataSource<Invoice>(this.pub.invoices);
        } else {
          if (!invoice.id) this.pub.invoices.push(invoice)
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
    if (elem.id) this.pub.authorPublications = this.pub.authorPublications.filter(e => e.id !== elem.id)
    else this.pub.authorPublications = this.pub.authorPublications.filter(e => e !== elem)
  }
  addAuthorship(authorPub?) {
    if (this.disabled || (authorPub && !authorPub.id)) return;
    if (!this.pub.authorPublications) this.pub.authorPublications = [];
    let data = {};
    data = { entity: authorPub }
    let dialogRef = this.dialog.open(AuthorshipFormComponent, {
      minWidth: "450px",
      data,
      disableClose: true
    });
    dialogRef.afterClosed().subscribe({
      next: data => {
        if (data?.author) {
          //if edit mode, delete the original version - edit mode only with ID
          if (authorPub && authorPub.id) {
            this.pub.authorPublications = this.pub.authorPublications.filter(e => e.id !== authorPub.id)
          }
          this.pub.authorPublications = this.pub.authorPublications.concat([data])
          if (this.table) this.table.dataSource = new MatTableDataSource<AuthorPublication>(this.pub.authorPublications);
        }
      }
    });
  }

  showStatusLabel(long: boolean) {
    let value = this.statuses?.find(e => e.id == this.form.get('status').value)?.label
    if (!value) return "";
    if (long) return value
    else {
      if (value.length > 27) return value.slice(0, 27) + "...";
      else return value;
    }
  }


  deleteSuppl(elem) {
    if (this.disabled) return;
    if (elem.id) this.pub.supplements = this.pub.supplements.filter(e => e.id !== elem.id)
    else this.pub.supplements = this.pub.supplements.filter(e => e.link !== elem.link)
  }
  addSuppl() {
    if (this.disabled || this.supplForm.invalid) return;
    if (!this.pub.supplements) this.pub.supplements = [];
    this.pub.supplements.push({
      link: this.supplForm.get('link').value,
    })
    this.supplForm.reset();
    if (this.supplTable) this.supplTable.dataSource = new MatTableDataSource<PublicationSupplement>(this.pub.supplements);
  }
}
