import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { AuthorService } from 'src/app/services/entities/author.service';
import { InstituteService } from 'src/app/services/entities/institute.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SharedModule } from 'src/app/shared/shared.module';

import { provideStore } from '@ngrx/store';
import { provideRouter } from '@angular/router';

import { AuthorFormComponent } from './author-form.component';

describe('AuthorFormComponent', () => {
  let component: AuthorFormComponent;
  let fixture: ComponentFixture<AuthorFormComponent>;

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

  const mockAuthorService = {
    getOne: jasmine.createSpy('getOne').and.returnValue(of({}))
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
      declarations: [ AuthorFormComponent ],
      providers: [
        FormBuilder,
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { entity: {} } },
        { provide: AuthorizationService, useValue: mockAuthService },
        { provide: ErrorPresentationService, useValue: mockErrorService },
        { provide: AuthorService, useValue: mockAuthorService },
        { provide: InstituteService, useValue: { getAll: () => of([]) } },
        { provide: PublisherService, useValue: { getAll: () => of([]) } },
        { provide: CostTypeService, useValue: { getAll: () => of([]) } },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideStore({})
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuthorFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }));

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
