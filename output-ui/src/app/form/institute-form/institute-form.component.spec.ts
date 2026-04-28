import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { InstituteService } from 'src/app/services/entities/institute.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SharedModule } from 'src/app/shared/shared.module';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';

import { InstituteFormComponent } from './institute-form.component';
import { AbstractFormComponent } from '../abstract-form/abstract-form.component';

describe('InstituteFormComponent', () => {
  let component: InstituteFormComponent;
  let fixture: ComponentFixture<InstituteFormComponent>;

  const mockDialogRef = {
    close: jasmine.createSpy('close')
  };

  const mockAuthService = {
    hasRole: jasmine.createSpy('hasRole').and.returnValue(true)
  };

  const mockErrorService = {
    clearFieldErrors: jasmine.createSpy('clearFieldErrors'),
    applyFieldErrors: jasmine.createSpy('applyFieldErrors'),
    present: jasmine.createSpy('present')
  };

  const mockInstService = {
    getOne: jasmine.createSpy('getOne').and.returnValue(of({})),
    getAll: jasmine.createSpy('getAll').and.returnValue(of([]))
  };

  beforeEach(fakeAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatSnackBarModule,
        SharedModule
      ],
      declarations: [ 
        InstituteFormComponent,
        AbstractFormComponent
      ],
      providers: [
        FormBuilder,
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { entity: {} } },
        { provide: AuthorizationService, useValue: mockAuthService },
        { provide: ErrorPresentationService, useValue: mockErrorService },
        { provide: InstituteService, useValue: mockInstService },
        { provide: PublisherService, useValue: { getAll: () => of([]) } },
        { provide: CostTypeService, useValue: { getAll: () => of([]) } },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideStore({})
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InstituteFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
