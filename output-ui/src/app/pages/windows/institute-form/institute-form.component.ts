import { AfterViewInit, Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { Observable, map, startWith } from 'rxjs';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { InstituteService } from 'src/app/services/entities/institute.service';
import { AliasInstitute } from '../../../../../../output-interfaces/Alias';
import { Institute } from '../../../../../../output-interfaces/Publication';

@Component({
  selector: 'app-institute-form',
  templateUrl: './institute-form.component.html',
  styleUrls: ['./institute-form.component.css']
})
export class InstituteFormComponent implements OnInit, AfterViewInit {

  public form: FormGroup;
  public aliasForm: FormGroup;

  institute: Institute;
  institutes: Institute[];
  filtered_super_institutes: Observable<Institute[]>;
  displayedColumns: string[] = ['id', 'label'];

  @ViewChild(MatTable) table: MatTable<AliasInstitute>;

  constructor(public dialogRef: MatDialogRef<InstituteFormComponent>, public tokenService: AuthorizationService,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private instService: InstituteService) { }

  ngAfterViewInit(): void {
    if (!this.tokenService.hasRole('writer')) {
      this.form.disable();
      this.aliasForm.disable();
    }
    if (this.data.institute?.id) {
      this.instService.getInstitute(this.data.institute.id).subscribe({
        next: data => {
          this.institute = data;
          this.form.patchValue(this.institute)
          this.form.get('super_inst').setValue(this.institute.super_institute?.label)
        }
      })
    }
    else this.institute = {
      label: this.data.institute.label
    }
    this.instService.getinstitutes().subscribe({
      next: data => {
        this.institutes = data.sort((a, b) => a.label.localeCompare(b.label));
        this.filtered_super_institutes = this.form.get('super_inst').valueChanges.pipe(
          startWith(this.institute?.super_institute?.label),
          map(value => this._filterSuperInst(value || '')),
        );
      }
    })


    this.form.patchValue(this.institute)
  }


  ngOnInit(): void {
    this.form = this.formBuilder.group({
      id: [''],
      title: [''],
      label: ['', Validators.required],
      short_label: [''],
      super_inst: ['']
    });
    this.aliasForm = this.formBuilder.group({
      alias: ['', Validators.required]
    });
    this.form.controls.id.disable();



  }

  action() {
    if (this.form.invalid) return;
    this.institute = { ...this.institute, ...this.form.getRawValue() }
    if (!this.institute.id) this.institute.id = undefined;
    this.dialogRef.close(this.institute)
  }

  abort() {
    this.dialogRef.close(null)
  }

  selectedSuperInst(event: MatAutocompleteSelectedEvent): void {
    this.addSuperInst(event.option)
  }

  addSuperInst(event) {
    let inst = this.institutes.find(e => e.label.trim().toLowerCase() === event.value.trim().toLowerCase());
    if (!this.institute.sub_institutes?.find(e => e.id === inst.id)) {
      this.institute.super_institute = inst;
      this.form.get('super_inst').setValue(this.institute.super_institute.label);
    } else {
      //TODO error
    }
  }

  private _filterSuperInst(value: string): Institute[] {
    const filterValue = value.toLowerCase();

    return this.institutes.filter(pub => pub?.label.toLowerCase().includes(filterValue) || pub?.short_label?.toLowerCase().includes(filterValue));
  }

  deleteAlias(elem: AliasInstitute) {
    this.institute.aliases = this.institute.aliases.filter((e) => e.alias !== elem.alias)
  }

  addAlias() {
    if (this.aliasForm.invalid) return;
    this.institute.aliases.push({
      alias: this.aliasForm.get('alias').value.toLocaleLowerCase().trim(),
      elementId: this.institute.id
    })
    this.aliasForm.reset();
    this.table.dataSource = new MatTableDataSource<AliasInstitute>(this.institute.aliases);
  }
}
