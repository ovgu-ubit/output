import { AfterViewInit, Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { Observable, map, startWith } from 'rxjs';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { ContractService } from 'src/app/services/entities/contract.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';
import { Contract, ContractIdentifier, Publisher } from '../../../../../../output-interfaces/Publication';
import { PublisherFormComponent } from '../publisher-form/publisher-form.component';

@Component({
  selector: 'app-contract-form',
  templateUrl: './contract-form.component.html',
  styleUrls: ['./contract-form.component.css']
})
export class ContractFormComponent implements OnInit, AfterViewInit {

  public form: FormGroup;
  public idForm: FormGroup;

  contract:Contract;
  today = new Date();

  publishers: Publisher[];
  filtered_publishers: Observable<Publisher[]>;
  
  displayedColumns: string[] = ['type', 'value', 'delete'];
  @ViewChild(MatTable) table: MatTable<ContractIdentifier>;
  disabled = false;

  constructor(public dialogRef: MatDialogRef<ContractFormComponent>, public tokenService: AuthorizationService,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private contractService:ContractService, private publisherService:PublisherService, private dialog: MatDialog, private _snackBar: MatSnackBar) {}
  
  
    ngAfterViewInit(): void {
    if (!this.tokenService.hasRole('writer')) {
      this.disable();
    }
    if (this.data.contract.id) {
      this.contractService.getContract(this.data.contract.id).subscribe({
        next: data => {
          this.contract = data;
          this.form.patchValue(this.contract)
          this.form.get('publ').setValue(this.contract.publisher?.label)
          if (this.contract.locked_at) {
            this.disable();
            this._snackBar.open('Vertrag wird leider gerade durch einen anderen Nutzer bearbeitet', 'Ok.', {
              duration: 5000,
              panelClass: [`warning-snackbar`],
              verticalPosition: 'top'
            })
          }
        }
      })
    }
    else this.contract = {
      label: this.data.contract.label,
      publisher: null
    }
    this.publisherService.getPublishers().subscribe({
      next: data => {
        this.publishers = data.sort((a, b) => a.label.localeCompare(b.label));
        this.filtered_publishers = this.form.get('publ').valueChanges.pipe(
          startWith(this.contract?.publisher?.label),
          map(value => this._filterPublisher(value || '')),
        );
      }
    })
    this.form.patchValue(this.contract)
  }
  
  disable() {
    this.disabled = true;
    this.form.disable();
    this.idForm.disable();
  }


  ngOnInit(): void {
    
    this.form = this.formBuilder.group({
      id: [''],
      label: ['', Validators.required],
      publ: [''],
      start_date: [''],
      end_date: [''],
      internal_number: [''],
      invoice_amount: [''],
      invoice_information: [''],
      sec_pub: [''],
      gold_option: [''],
      verification_method: [''],
    });
    this.form.controls.id.disable();
    this.idForm = this.formBuilder.group({
      type: ['', Validators.required],
      value: ['', Validators.required]
    })
  }
  
  private _filterPublisher(value: string): Publisher[] {
    const filterValue = value.toLowerCase();

    return this.publishers.filter(pub => pub?.label.toLowerCase().includes(filterValue));
  }
  
  selectedPubl(event: MatAutocompleteSelectedEvent): void {
    if (this.disabled) return;
    this.contract.publisher = this.publishers.find(e => e.label.trim().toLowerCase() === event.option.value.trim().toLowerCase());
    this.form.get('publ').setValue(this.contract.publisher.label)
  }
  
  addPublisher(event) {
    if (this.disabled) return;
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
                  this.contract.publisher = data[0];
                  this.form.get('publ').setValue(this.contract.publisher.label)
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
          publisher: this.contract.publisher
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
              this.contract.publisher = data[0];
              this.form.get('publ').setValue(this.contract.publisher.label)
            }
          })
        }
        this.form.get('publ').enable();
      });
    }
  }

  action() {
    this.contract = {...this.contract, ...this.form.getRawValue()}
    if (!this.contract.id) this.contract.id = undefined;
    if (!this.contract.invoice_amount) this.contract.invoice_amount = undefined;
    if (!this.contract.start_date) this.contract.start_date = undefined;
    if (!this.contract.end_date) this.contract.end_date = undefined;
    this.dialogRef.close(this.contract)
  }

  close() {
    this.dialogRef.close(null)
  }

  abort() {
    if (this.form.dirty) {
      let dialogData = new ConfirmDialogModel("Ungesicherte Änderungen", `Es gibt ungespeicherte Änderungen, möchten Sie diese zunächst speichern?`);

      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        maxWidth: "400px",
        data: dialogData
      });

      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult) { //save
          this.action();
        } else this.dialogRef.close({ id: this.contract.id, locked_at: null })
      });
    } else this.dialogRef.close({ id: this.contract.id, locked_at: null })
  }
  
  deleteId(elem) {
    if (this.disabled) return;
    this.contract.identifiers = this.contract.identifiers.filter(e => e.id !== elem.id)
  }
  addId() {
    if (this.disabled) return;
    this.contract.identifiers.push({
      type: this.idForm.get('type').value,
      value: this.idForm.get('value').value
    })
    this.idForm.reset();
    this.table.dataSource = new MatTableDataSource<ContractIdentifier>(this.contract.identifiers);
  }
}
