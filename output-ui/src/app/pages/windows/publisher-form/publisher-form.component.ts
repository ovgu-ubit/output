import { AfterViewInit, Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { AliasPublisher } from '../../../../../../output-interfaces/Alias';
import { Publisher } from '../../../../../../output-interfaces/Publication';

@Component({
  selector: 'app-publisher-form',
  templateUrl: './publisher-form.component.html',
  styleUrls: ['./publisher-form.component.css']
})
export class PublisherFormComponent implements OnInit, AfterViewInit{

  public form: FormGroup;
  public aliasForm: FormGroup;

  publisher:Publisher;

  @ViewChild(MatTable) table: MatTable<AliasPublisher>;

  constructor(public dialogRef: MatDialogRef<PublisherFormComponent>, public tokenService: AuthorizationService,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private publisherService:PublisherService) {}

  ngAfterViewInit(): void {
    if (!this.tokenService.hasRole('writer')) {
      this.form.disable();
      this.aliasForm.disable();
    }
    if (this.data.publisher.id) {
      this.publisherService.getPublisher(this.data.publisher.id).subscribe({
        next: data => {
          this.publisher = data;
          this.form.patchValue(this.publisher)
        }
      })
    }
    else this.publisher = {
      label: this.data.publisher.label
    }
    this.form.patchValue(this.publisher)
  }


  ngOnInit(): void {
    this.form = this.formBuilder.group({
      id: [''],
      label: ['', Validators.required],
      location: ['']
    });
    this.form.controls.id.disable();
    
    this.aliasForm = this.formBuilder.group({
      alias: ['', Validators.required]
    });
  }

  action() {
    this.publisher = {...this.publisher, ...this.form.getRawValue()}
    this.dialogRef.close(this.publisher)
  }

  abort() {
    this.dialogRef.close(null)
  }

  deleteAlias(elem:AliasPublisher) {
    this.publisher.aliases = this.publisher.aliases.filter((e) => e.alias !== elem.alias)
  }

  addAlias() {
    if (this.aliasForm.invalid) return;
    this.publisher.aliases.push({
      alias: this.aliasForm.get('alias').value.toLocaleLowerCase().trim(),
      elementId: this.publisher.id
    })
    this.aliasForm.reset();
    this.table.dataSource = new MatTableDataSource<AliasPublisher>(this.publisher.aliases);
  }
}

