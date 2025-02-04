import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { map, merge } from 'rxjs';
import { AuthorService } from 'src/app/services/entities/author.service';
import { InstituteService } from 'src/app/services/entities/institute.service';
import { RoleService } from 'src/app/services/entities/role.service';
import { AliasFormComponent } from 'src/app/tools/alias-form/alias-form.component';
import { AuthorPublication, Institute, Role } from '../../../../../../output-interfaces/Publication';
import { AbstractFormComponent } from '../abstract-form/abstract-form.component';
import { AuthorFormComponent } from '../author-form/author-form.component';
import { InstituteFormComponent } from '../institute-form/institute-form.component';
import { RoleFormComponent } from '../role-form/role-form.component';

@Component({
  selector: 'app-authorship-form',
  templateUrl: './authorship-form.component.html',
  styleUrls: ['./authorship-form.component.css']
})
export class AuthorshipFormComponent extends AbstractFormComponent<any> implements OnInit, AfterViewInit {

  override fields = [
    { key: 'affiliation', title: 'Affiliationsangabe (optional)' },
    { key: 'author', title: 'Person', required: true },
    { key: 'corresponding', title: 'Corresponding?', type: 'boolean' },
  ]

  institutes: Institute[];

  override entity: AuthorPublication = {};
  authorForm = AuthorFormComponent;
  instForm = InstituteFormComponent;
  roleForm = RoleFormComponent;

  constructor(public override dialogRef: MatDialogRef<AuthorshipFormComponent>,
    @Inject(MAT_DIALOG_DATA) public override data: any, public authorService: AuthorService, public instService: InstituteService,
    public roleService: RoleService) { super(); }

  override form = this.formBuilder.group({
    author: ['', [Validators.required]],
    affiliation: [''],
    institute: [''],
    corresponding: [''],
  })

  override ngOnInit(): void {
    let ob$ = this.instService.getAll().pipe(map(data => {
      this.institutes = data.sort((a, b) => a.label.localeCompare(b.label));
    }))
    ob$.subscribe({
      complete: () => {
        if (this.data.entity) {
          this.entity = this.data.entity;
          this.form.get('affiliation').setValue(this.data.entity?.affiliation)
          this.form.get('author').setValue(this.data.entity?.author.last_name + ", " + this.data.entity?.author.first_name)
          this.form.get('corresponding').setValue(this.data.entity?.corresponding)
        } else {//new authorship
        }
      }
    })
  }

  override ngAfterViewInit(): void {
  }

  compare(i1, i2) {
    return (i1?.id === i2?.id)
  }

  override action() {
    if (!this.entity.author) return;
    if (this.entity.institute && !this.entity.author.institutes?.find(e => this.entity.institute.id === e.id)) {
      //save institute to author
      if (!this.entity.author.institutes) this.entity.author.institutes = [];
      this.entity.author.institutes.push(this.entity.institute);
      this.authorService.update(this.entity.author).subscribe()
    }
    if (this.form.get('affiliation').value && this.entity.institute && !this.entity.institute.aliases?.find(e => this.form.get('affiliation').value.includes(e.alias))) {
      //open alias dialog
      let aliases = [this.form.get('affiliation').value];

      let dialogRef = this.dialog.open(AliasFormComponent, {
        width: '400px',
        data: {
          aliases
        },
        disableClose: true
      });
      dialogRef.afterClosed().subscribe(result => {
        let inst = this.entity.institute;
        if (result && result.length > 0) {
          inst = this.institutes.find(e => e.id === this.entity.institute.id)
          inst.aliases.push({ elementId: this.entity.institute.id, alias: result[0] });
          this.instService.update(inst).subscribe()
        }
        this.dialogRef.close({ author: this.entity.author, authorId: this.entity.author.id, institute: this.entity.institute, corresponding: this.form.get('corresponding').value, role: this.entity.role, affiliation: this.form.get('affiliation').value });
      });
    }
    else this.dialogRef.close({ author: this.entity.author, authorId: this.entity.author.id, institute: this.entity.institute, corresponding: this.form.get('corresponding').value, role: this.entity.role, affiliation: this.form.get('affiliation').value });
  }

  setAut(event) {
    this.entity.author = event;
  }

  setInst(event) {
    this.entity.institute = event;
  }

  setRole(event) {
    this.entity.role = event;
  }
}
