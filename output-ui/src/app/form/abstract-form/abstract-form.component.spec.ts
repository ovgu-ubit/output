import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { AbstractFormComponent } from './abstract-form.component';

describe('AbstractFormComponent', () => {
  let component: AbstractFormComponent<any>;
  let fixture: ComponentFixture<AbstractFormComponent<any>>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<any>>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let errorPresentation: jasmine.SpyObj<ErrorPresentationService>;
  let tokenService: jasmine.SpyObj<AuthorizationService>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<any>>('MatDialogRef', ['close']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    errorPresentation = jasmine.createSpyObj<ErrorPresentationService>('ErrorPresentationService', ['clearFieldErrors', 'applyFieldErrors', 'present']);
    tokenService = jasmine.createSpyObj<AuthorizationService>('AuthorizationService', ['hasRole']);
    tokenService.hasRole.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [AbstractFormComponent],
      providers: [
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']) },
        { provide: ErrorPresentationService, useValue: errorPresentation },
        { provide: AuthorizationService, useValue: tokenService },
        { provide: PublisherService, useValue: {} },
        { provide: CostTypeService, useValue: {} },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .overrideComponent(AbstractFormComponent, {
      set: { template: '' }
    })
    .compileComponents();

    fixture = TestBed.createComponent(AbstractFormComponent);
    component = fixture.componentInstance;
    component.fields = [{ key: 'label', title: 'Label', required: true }];
    component.data = { entity: {} };
    component.dialogRef = dialogRef;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('returns deferred dialog data by default even when a service exists', async () => {
    component.service = jasmine.createSpyObj('EntityService', ['add', 'update']);
    component.form.get('label')?.setValue('Invoice draft');

    await component.action();

    expect(component.service.add).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith(jasmine.objectContaining({
      label: 'Invoice draft',
      updated: true,
    }));
  });

  it('persists through the service when persistOnSave is enabled by the caller', async () => {
    const service = jasmine.createSpyObj('EntityService', ['add', 'update']);
    service.add.and.returnValue(of({ id: 42, label: 'Institute' }));
    component.service = service;
    component.data = { entity: {}, persistOnSave: true };
    component.form.get('label')?.setValue('Institute');

    await component.action();

    expect(service.add).toHaveBeenCalledWith(jasmine.objectContaining({
      label: 'Institute',
    }));
    expect(dialogRef.close).toHaveBeenCalledWith({
      persisted: true,
      mode: 'create',
      entity: { id: 42, label: 'Institute' },
    });
  });
});
