import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { AuthorService } from 'src/app/services/entities/author.service';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';
import { InstituteService } from 'src/app/services/entities/institute.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { AuthorFormComponent } from './author-form.component';

describe('AuthorFormComponent', () => {
  let component: AuthorFormComponent;
  let fixture: ComponentFixture<AuthorFormComponent>;

  beforeEach(async () => {
    const dialogRef = jasmine.createSpyObj<MatDialogRef<AuthorFormComponent>>('MatDialogRef', ['close']);
    const tokenService = jasmine.createSpyObj<AuthorizationService>('AuthorizationService', ['hasRole']);
    tokenService.hasRole.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [AuthorFormComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { entity: {} } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MatDialog, useValue: jasmine.createSpyObj<MatDialog>('MatDialog', ['open']) },
        { provide: MatSnackBar, useValue: jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']) },
        { provide: ErrorPresentationService, useValue: jasmine.createSpyObj<ErrorPresentationService>('ErrorPresentationService', ['clearFieldErrors', 'applyFieldErrors', 'present']) },
        { provide: AuthorizationService, useValue: tokenService },
        { provide: AuthorService, useValue: jasmine.createSpyObj<AuthorService>('AuthorService', ['getOne', 'add', 'update']) },
        { provide: InstituteService, useValue: {} },
        { provide: PublisherService, useValue: {} },
        { provide: CostTypeService, useValue: {} },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .overrideComponent(AuthorFormComponent, {
      set: { template: '' }
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuthorFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('builds an empty alias table when a new author has no aliases yet', () => {
    component.entity = {
      first_name: 'Ada',
      last_name: 'Lovelace',
    };

    component.updateAlias();

    expect(component.alias_data).toEqual([]);
  });

  it('combines first-name and last-name aliases into one table datasource', () => {
    component.entity = {
      first_name: 'Ada',
      last_name: 'Lovelace',
      aliases_first_name: [{ alias: 'augusta', elementId: 1 }],
      aliases_last_name: [{ alias: 'king', elementId: 1 }],
    };

    component.updateAlias();

    expect(component.alias_data).toEqual([
      { alias: 'augusta', first_name: true },
      { alias: 'king', first_name: false },
    ]);
  });
});
