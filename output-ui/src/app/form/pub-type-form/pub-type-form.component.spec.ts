import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { of } from 'rxjs';
import { PublicationTypeService } from 'src/app/services/entities/publication-type.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SharedModule } from 'src/app/shared/shared.module';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';

import { PubTypeFormComponent } from './pub-type-form.component';
import { AbstractFormComponent } from '../abstract-form/abstract-form.component';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';

describe('PubTypeFormComponent', () => {
  let component: PubTypeFormComponent;
  let fixture: ComponentFixture<PubTypeFormComponent>;

  const mockDialogRef = {
    close: jasmine.createSpy('close')
  };

  const mockPubTypeService = {
    getOne: jasmine.createSpy('getOne').and.returnValue(of({}))
  };

  beforeEach(fakeAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        MatDialogModule,
        MatSnackBarModule,
        SharedModule
      ],
      declarations: [ 
        PubTypeFormComponent,
        AbstractFormComponent
      ],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { entity: {} } },
        { provide: PublicationTypeService, useValue: mockPubTypeService },
        { provide: AuthorizationService, useValue: { hasRole: () => true } },
        { provide: ErrorPresentationService, useValue: { clearFieldErrors: () => {}, applyFieldErrors: () => {}, present: () => {} } },
        { provide: PublisherService, useValue: {} },
        { provide: CostTypeService, useValue: {} },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideStore({})
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PubTypeFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
