import { AfterViewInit, Component, Inject, Injectable, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { concat, concatMap, delay, firstValueFrom, map, merge } from 'rxjs';
import { ConfigService } from 'src/app/administration/services/config.service';
import { EnrichService } from 'src/app/administration/services/enrich.service';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { AuthorshipFormComponent } from 'src/app/form/authorship-form/authorship-form.component';
import { ContractFormComponent } from 'src/app/form/contract-form/contract-form.component';
import { DoiFormComponent } from 'src/app/form/doi-form/doi-form.component';
import { FunderFormComponent } from 'src/app/form/funder-form/funder-form.component';
import { GreaterEntityFormComponent } from 'src/app/form/greater-entity-form/greater-entity-form.component';
import { InvoiceFormComponent } from 'src/app/form/invoice-form/invoice-form.component';
import { OaCategoryFormComponent } from 'src/app/form/oa-category-form/oa-category-form.component';
import { PubTypeFormComponent } from 'src/app/form/pub-type-form/pub-type-form.component';
import { PublisherFormComponent } from 'src/app/form/publisher-form/publisher-form.component';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { ContractService } from 'src/app/services/entities/contract.service';
import { FunderService } from 'src/app/services/entities/funder.service';
import { GreaterEntityService } from 'src/app/services/entities/greater-entity.service';
import { LanguageService } from 'src/app/services/entities/language.service';
import { OACategoryService } from 'src/app/services/entities/oa-category.service';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { PublicationTypeService } from 'src/app/services/entities/publication-type.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { isPersistedEntityDialogResult } from 'src/app/services/entities/service.interface';
import { StatusService } from 'src/app/services/entities/status.service';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/shared/confirm-dialog/confirm-dialog.component';
import { IdTableComponent } from 'src/app/shared/id-table/id-table.component';
import { AuthorPublication, Invoice, Publication, PublicationSupplement, Status } from '../../../../../../output-interfaces/Publication';

@Injectable({ providedIn: 'root' })
export class PubValidator {
  public pubValidator(): ValidatorFn {
    return (formGroup: FormGroup) => {
      let t1;
      let t2 = null;
      if (!(formGroup.get('biblio_info').get('pub_date').value
        || formGroup.get('biblio_info').get('pub_date_print').value
        || formGroup.get('biblio_info').get('pub_date_accepted').value
        || formGroup.get('biblio_info').get('pub_date_submitted').value)) {
        t1 = { no_pub_date: true };
      }
      if (!formGroup.get('title').value && !formGroup.get('doi').value) {
        t2 = { no_title_or_doi: true };
      }
      if (!t1 && !t2) return null;
      return { ...t1, ...t2 };
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
  isMaximized = false;
  saving = false;

  edit = false;
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
  licenses = ['cc-by', 'cc-by-nc', 'cc-by-nd', 'cc-by-sa', 'cc-by-nc-nd', 'cc-by-nc-sa', 'Sonstige'];
  currencies = ['EUR', 'USD', 'CHF'];
  private readonly defaultDialogWidth: string;
  private readonly defaultDialogHeight = '800px';
  optional_fields: {
    abstract?: boolean,
    citation?: boolean,
    page_count?: boolean,
    pub_date_submitted?: boolean,
    pub_date_print?: boolean,
    peer_reviewed?: boolean
  } = {};

  publisherForm = PublisherFormComponent;
  contractForm = ContractFormComponent;
  funderForm = FunderFormComponent;
  geForm = GreaterEntityFormComponent;
  oaForm = OaCategoryFormComponent;
  ptForm = PubTypeFormComponent;
  private readonly apiFieldPathMap: Record<string, string> = {
    authors: 'author_info.authors',
    peer_reviewed: 'biblio_info.peer_reviewed',
    pub_date: 'biblio_info.pub_date',
    pub_date_print: 'biblio_info.pub_date_print',
    pub_date_submitted: 'biblio_info.pub_date_submitted',
    pub_date_accepted: 'biblio_info.pub_date_accepted',
    abstract: 'biblio_info.abstract',
    volume: 'biblio_info.volume',
    issue: 'biblio_info.issue',
    first_page: 'biblio_info.first_page',
    last_page: 'biblio_info.last_page',
    publisher_location: 'biblio_info.publisher_location',
    edition: 'biblio_info.edition',
    article_number: 'biblio_info.article_number',
    page_count: 'biblio_info.page_count',
    second_pub: 'oa_info.second_pub',
    is_oa: 'oa_info.is_oa',
    oa_status: 'oa_info.oa_status',
    is_journal_oa: 'oa_info.is_journal_oa',
    best_oa_host: 'oa_info.best_oa_host',
    best_oa_license: 'oa_info.best_oa_license',
    cost_approach: 'finance_info.cost_approach',
    cost_approach_currency: 'finance_info.cost_approach_currency',
    grant_number: 'finance_info.grant_number',
    not_budget_relevant: 'finance_info.not_budget_relevant',
    contract_year: 'finance_info.contract_year',
  };

  constructor(
    public dialogRef: MatDialogRef<PublicationFormComponent>,
    public tokenService: AuthorizationService,
    private pubValidator: PubValidator,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private formBuilder: FormBuilder,
    private publicationService: PublicationService,
    private dialog: MatDialog,
    public pubTypeService: PublicationTypeService,
    private _snackBar: MatSnackBar,
    public oaService: OACategoryService,
    public geService: GreaterEntityService,
    public publisherService: PublisherService,
    public contractService: ContractService,
    public funderService: FunderService,
    public languageService: LanguageService,
    private configService: ConfigService,
    private statusService: StatusService,
    private enrichService: EnrichService,
    private errorPresentation: ErrorPresentationService,
  ) {
    this.defaultDialogWidth = this.data?.entity?.id ? '1000px' : '800px';
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
        cost_approach_currency: ['EUR'],
        grant_number: [''],
        not_budget_relevant: [''],
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
    });
  }

  ngOnInit(): void {
    let ob$ = this.configService.get('optional_fields').pipe(map(data => {
      this.optional_fields = data.value;
    }));
    ob$ = merge(ob$, this.configService.get('institution_short_label').pipe(map(data => {
      this.institution = data.value;
    })));
    ob$ = merge(ob$, this.configService.get('doi_import_service').pipe(map(data => {
      this.doi_import_service = data?.value;
    })));

    if (this.data.entity?.id) {
      this.edit = true;
      this.loading = true;
      ob$ = merge(ob$, this.loadPub(this.data.entity?.id));
    } else {
      this.edit = false;
      this.pub = {
        authorPublications: [],
        identifiers: [],
        cost_approach_currency: 'EUR'
      };
      const dialogRef = this.dialog.open(DoiFormComponent, {
        width: '800px',
        maxHeight: '800px',
        data: {},
        disableClose: true
      });
      ob$ = concat(ob$, dialogRef.afterClosed().pipe(map(result => {
        if (!result?.doi) return;

        this.pub.doi = result.doi;
        this.pub.dataSource = 'Manuell per DOI hinzugefuegt';
        this.form.patchValue({
          doi: this.pub.doi,
          dataSource: this.pub.dataSource,
        });

        this.loading = true;
        this.publicationService.add(this.pub).pipe(
          concatMap(data => {
            const createdPublication = this.normalizeSavedPublication(data, this.pub);
            this.pub.id = createdPublication.id;
            return this.enrichService.startID(this.doi_import_service, [this.pub.id], false).pipe(delay(2000));
          }),
          concatMap(() => {
            this.edit = true;
            return this.loadPub(this.pub.id);
          })
        ).subscribe({
          error: (error) => {
            this.loading = false;
            this.errorPresentation.present(error, { action: 'create', entity: 'Publikation' });
          }
        });
      })));
    }

    ob$ = merge(ob$, this.loadMasterData());

    ob$.subscribe({
      complete: () => {
      },
      error: (error) => {
        this.loading = false;
        this.errorPresentation.present(error, { action: 'load', entity: 'Publikation' });
        this.dialogRef.close(null);
      }
    });
  }

  loadPub(id: number) {
    return this.publicationService.getOne(id).pipe(map(data => {
      this.pub = data;
      this.form.patchValue(data);
      this.form.get('author_info').patchValue(data);
      this.form.get('biblio_info').patchValue(data);
      this.form.get('oa_info').patchValue(data);
      this.form.get('finance_info').patchValue(data);
      if (!this.form.get('finance_info').get('cost_approach_currency').value) {
        this.form.get('finance_info').get('cost_approach_currency').setValue('EUR');
      }
      if (this.pub.best_oa_license && !this.licenses.find(e => e === this.pub.best_oa_license)) {
        this.form.get('oa_info').get('best_oa_license').setValue('Sonstige');
      }

      if (this.pub?.locked) {
        this.setLock(true);
      } else {
        if (this.pub?.locked_author) this.form.get('author_info').disable();
        if (this.pub?.locked_biblio) this.form.get('biblio_info').disable();
        if (this.pub?.locked_oa) this.form.get('oa_info').disable();
        if (this.pub?.locked_finance) this.form.get('finance_info').disable();
      }

      if (this.pub.locked_at && (this.tokenService.hasRole('writer') || this.tokenService.hasRole('admin'))) {
        this.disable();
        this._snackBar.open('Publikation wird leider gerade durch einen anderen Nutzer bearbeitet', 'Ok.', {
          duration: 5000,
          panelClass: ['warning-snackbar'],
          verticalPosition: 'top'
        });
      } else if (!this.tokenService.hasRole('writer') && !this.tokenService.hasRole('admin')) {
        this.disable();
      }
      this.loading = false;
    }));
  }

  loadMasterData() {
    return this.statusService.getAll().pipe(map(data => {
      this.statuses = data.sort((a, b) => a.label.localeCompare(b.label));
    }));
  }

  ngAfterViewInit(): void {
  }

  disable() {
    this.disabled = true;
    this.form.disable();
  }

  setPublisher(event) {
    this.pub.publisher = event;
    this.form.markAsDirty();
  }

  setContract(event) {
    this.pub.contract = event;
    this.form.markAsDirty();
  }

  setFunder(event) {
    if (!this.pub.funders) this.pub.funders = [];
    this.pub.funders.push(event);
    this.form.markAsDirty();
  }

  removeFunder(funder) {
    if (this.disabled) return;
    this.pub.funders = this.pub.funders.filter(ap => ap.id !== funder.id);
    this.form.markAsDirty();
  }

  setGE(event) {
    this.pub.greater_entity = event;
    this.form.markAsDirty();
  }

  setOA(event) {
    this.pub.oa_category = event;
    this.form.markAsDirty();
  }

  setLang(event) {
    this.pub.language = event;
    this.form.markAsDirty();
  }

  setPubType(event) {
    this.pub.pub_type = event;
    this.form.markAsDirty();
  }

  close() {
    this.dialogRef.close(null);
  }

  toggleMaximize() {
    this.isMaximized = !this.isMaximized;

    if (this.isMaximized) {
      this.dialogRef.addPanelClass('publication-form-dialog-maximized');
      this.dialogRef.updateSize('100vw', '100vh');
      this.dialogRef.updatePosition({ top: '0', left: '0' });
      return;
    }

    this.dialogRef.removePanelClass('publication-form-dialog-maximized');
    this.dialogRef.updateSize(this.defaultDialogWidth, this.defaultDialogHeight);
    this.dialogRef.updatePosition();
  }

  abort(): void {
    if (this.form.dirty) {
      const dialogData = new ConfirmDialogModel('Ungesicherte Aenderungen', 'Es gibt ungespeicherte Aenderungen, moechten Sie diese zunaechst speichern?');

      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        maxWidth: '400px',
        data: dialogData,
        disableClose: true
      });

      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult) {
          this.action();
        } else if (this.pub.id) {
          this.dialogRef.close({ id: this.pub.id, locked_at: null });
        } else {
          this.close();
        }
      });
    } else if (this.pub.id) {
      this.dialogRef.close({ id: this.pub.id, locked_at: null });
    } else {
      this.close();
    }
  }

  async action() {
    if (this.saving) return;

    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.idTable && this.idTable.isDirty()) {
      const dialogData = new ConfirmDialogModel('Ungesicherte Aenderungen', 'Es gibt einen ungespeicherten Identifier, moechten Sie diesen zunaechst speichern?');

      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        maxWidth: '400px',
        data: dialogData,
        disableClose: true
      });

      const dialogResult = await firstValueFrom(dialogRef.afterClosed());
      if (dialogResult) {
        this.idTable.addId();
      }
    }

    this.pub = this.buildPublicationPayload();
    this.saving = true;
    this.errorPresentation.clearFieldErrors(this.form);

    try {
      const response = await firstValueFrom(this.edit
        ? this.publicationService.update(this.pub)
        : this.publicationService.add(this.pub));
      const savedPublication = this.normalizeSavedPublication(response, this.pub);
      this.dialogRef.close({
        persisted: true,
        mode: this.edit ? 'update' : 'create',
        entity: savedPublication,
      });
    } catch (error) {
      this.errorPresentation.applyFieldErrors(this.form, error, {
        pathMap: this.apiFieldPathMap,
      });
      this.errorPresentation.present(error, {
        action: this.edit ? 'save' : 'create',
        entity: 'Publikation',
      });
    } finally {
      this.saving = false;
    }
  }

  getAuthorInfo() {
    if (this.pub?.authorPublications) return `${this.pub.authorPublications.length} ${this.institution} Person(en)`;
    return `kein(e) ${this.institution} Person(en)`;
  }

  enter(event) {
    if (event.keyCode === 13 && event.srcElement.localName !== 'textarea') return false;
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
      this.setLock(this.pub.locked);
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
    if (!invoice.cost_items) return '';
    let sum = 0;
    for (const ci of invoice.cost_items) sum += ci.euro_value;
    return sum;
  }

  deleteInvoice(elem) {
    if (elem.id) this.pub.invoices = this.pub.invoices.filter(e => e.id !== elem.id);
    else this.pub.invoices = this.pub.invoices.filter(e => e !== elem);
  }

  addInvoice(invoice?: Invoice) {
    if (!this.pub.invoices) this.pub.invoices = [];
    const dialogRef = this.dialog.open(InvoiceFormComponent, {
      width: '800px',
      data: {
        entity: invoice,
        locked: this.pub.locked || this.pub.locked_finance || this.disabled
      },
      disableClose: true
    });
    if (invoice && !invoice.id) this.pub.invoices = this.pub.invoices.filter(e => e !== invoice);
    dialogRef.afterClosed().subscribe({
      next: data => {
        if (isPersistedEntityDialogResult<Invoice>(data)) {
          if (invoice?.id) this.pub.invoices = this.pub.invoices.filter(e => e.id !== data.entity.id);
          this.pub.invoices.push(data.entity);
          if (this.table) this.table.dataSource = new MatTableDataSource<Invoice>(this.pub.invoices);
        } else if (data && data.updated) {
          if (invoice?.id) this.pub.invoices = this.pub.invoices.filter(e => e.id !== data.id);
          this.pub.invoices.push(data);
          if (this.table) this.table.dataSource = new MatTableDataSource<Invoice>(this.pub.invoices);
        } else if (invoice && !invoice.id) {
          this.pub.invoices.push(invoice);
        }
      }
    });
  }

  restore() {
    this.pub.delete_date = null;
    this.form.get('delete_date').setValue(null);
  }

  deleteAuthorship(elem) {
    if (this.disabled) return;
    if (elem.id) this.pub.authorPublications = this.pub.authorPublications.filter(e => e.id !== elem.id);
    else this.pub.authorPublications = this.pub.authorPublications.filter(e => e !== elem);
  }

  addAuthorship(authorPub?) {
    if (this.disabled || (authorPub && !authorPub.id)) return;
    if (!this.pub.authorPublications) this.pub.authorPublications = [];
    const data = { entity: authorPub };
    const dialogRef = this.dialog.open(AuthorshipFormComponent, {
      minWidth: '450px',
      data,
      disableClose: true
    });
    dialogRef.afterClosed().subscribe({
      next: result => {
        if (result?.author) {
          if (authorPub && authorPub.id) {
            this.pub.authorPublications = this.pub.authorPublications.filter(e => e.id !== authorPub.id);
          }
          this.pub.authorPublications = this.pub.authorPublications.concat([result]);
          if (this.table) this.table.dataSource = new MatTableDataSource<AuthorPublication>(this.pub.authorPublications);
        }
      }
    });
  }

  showStatusLabel(long: boolean) {
    const value = this.statuses?.find(e => e.id == this.form.get('status').value)?.label;
    if (!value) return '';
    if (long) return value;
    if (value.length > 27) return `${value.slice(0, 27)}...`;
    return value;
  }

  deleteSuppl(elem) {
    if (this.disabled) return;
    if (elem.id) this.pub.supplements = this.pub.supplements.filter(e => e.id !== elem.id);
    else this.pub.supplements = this.pub.supplements.filter(e => e.link !== elem.link);
  }

  addSuppl() {
    if (this.disabled || this.supplForm.invalid) return;
    if (!this.pub.supplements) this.pub.supplements = [];
    this.pub.supplements.push({
      link: this.supplForm.get('link').value,
    });
    this.supplForm.reset();
    if (this.supplTable) this.supplTable.dataSource = new MatTableDataSource<PublicationSupplement>(this.pub.supplements);
  }

  getFieldError(path: string, fallback?: string): string | null {
    const control = this.form?.get(path);
    if (!control) return null;
    if (typeof control.errors?.['apiMessage'] === 'string') return control.errors['apiMessage'];
    if (!(this.submitted || control.touched || control.dirty)) return null;
    if ((path === 'title' || path === 'doi') && this.form.errors?.['no_title_or_doi']) {
      return 'Titel oder DOI muss angegeben werden.';
    }
    if (path === 'biblio_info.pub_date' && this.form.errors?.['no_pub_date']) {
      return 'Mindestens ein Publikationsdatum muss angegeben werden.';
    }
    if (control.hasError('required')) return `${fallback ?? path} ist erforderlich.`;
    if (control.hasError('pattern')) return `${fallback ?? path} hat ein ungueltiges Format.`;
    return null;
  }

  getFormSummaryErrors(): string[] {
    const summary: string[] = [];
    if (this.submitted || this.form?.touched || this.form?.dirty) {
      if (this.form?.errors?.['no_title_or_doi']) summary.push('Titel oder DOI muss angegeben werden.');
      if (this.form?.errors?.['no_pub_date']) summary.push('Mindestens ein Publikationsdatum muss angegeben werden.');
    }

    const apiSummary = this.form?.errors?.['apiSummary'];
    if (Array.isArray(apiSummary)) {
      summary.push(...apiSummary.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0));
    }

    return summary;
  }

  private buildPublicationPayload(): Publication {
    const formValue = {
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
    };

    let publication: Publication & Record<string, unknown>;
    if (this.edit) {
      publication = { ...this.pub, ...formValue, locked_at: null };
    } else {
      publication = {
        ...this.pub,
        ...formValue,
        dataSource: this.form.get('dataSource').value || 'Manuell hinzugefuegt',
        pub_date: this.normalizeDateValue(this.form.get('biblio_info').get('pub_date').value),
        pub_date_print: this.normalizeDateValue(this.form.get('biblio_info').get('pub_date_print').value),
        pub_date_accepted: this.normalizeDateValue(this.form.get('biblio_info').get('pub_date_accepted').value),
        pub_date_submitted: this.normalizeDateValue(this.form.get('biblio_info').get('pub_date_submitted').value),
      };
      for (const key of Object.keys(publication)) {
        if (!publication[key]) publication[key] = undefined;
      }
    }
    for (const key of Object.keys(publication)) {
      if (publication[key] === '') publication[key] = null;
    }
    if (!publication.cost_approach_currency) publication.cost_approach_currency = 'EUR';
    return publication as Publication;
  }

  private normalizeDateValue(value: any): any {
    if (!value) return undefined;
    return typeof value.format === 'function' ? value.format() : value;
  }

  private normalizeSavedPublication(response: unknown, fallback: Publication): Publication {
    if (Array.isArray(response)) {
      return (response[0] ?? fallback) as Publication;
    }
    return (response ?? fallback) as Publication;
  }
}
