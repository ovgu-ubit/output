import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SharedModule } from 'src/app/shared/shared.module';

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
      imports: [
        NoopAnimationsModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatSnackBarModule,
        SharedModule
      ],
      declarations: [AbstractFormComponent],
      providers: [
        FormBuilder,
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']) },
        { provide: ErrorPresentationService, useValue: errorPresentation },
        { provide: AuthorizationService, useValue: tokenService },
        { provide: PublisherService, useValue: {} },
        { provide: CostTypeService, useValue: {} },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
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

  it('releases the edit lock when a writable read-only form is closed', () => {
    component.service = jasmine.createSpyObj('EntityService', ['add', 'update']);
    component.entity = { id: 7, label: 'Contract' };
    tokenService.hasRole.and.callFake((role: string) => role === 'writer');

    component.close();

    expect(dialogRef.close).toHaveBeenCalledWith({ id: 7, locked_at: null });
  });

  it('does not release locks on close when the loaded entity is already locked elsewhere', () => {
    component.service = jasmine.createSpyObj('EntityService', ['add', 'update']);
    component.entity = { id: 7, label: 'Contract', locked_at: new Date('2026-04-10T10:00:00Z') };
    tokenService.hasRole.and.callFake((role: string) => role === 'writer');

    component.close();

    expect(dialogRef.close).toHaveBeenCalledWith(null);
  });
});
