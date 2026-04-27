import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ConfigService } from 'src/app/administration/services/config.service';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SharedModule } from 'src/app/shared/shared.module';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';

import { ReportingYearFormComponent } from './reporting-year-form.component';

describe('ReportingYearFormComponent', () => {
  let component: ReportingYearFormComponent;
  let fixture: ComponentFixture<ReportingYearFormComponent>;

  const mockDialogRef = {
    close: jasmine.createSpy('close')
  };

  const mockPubService = {
    getReportingYears: jasmine.createSpy('getReportingYears').and.returnValue(of([]))
  };

  const mockConfigService = {
    get: jasmine.createSpy('get').and.returnValue(of({ value: {} })),
    set: jasmine.createSpy('set').and.returnValue(of({}))
  };

  const mockAuthService = {
    checkPermission: jasmine.createSpy('checkPermission').and.returnValue(true),
    hasRole: jasmine.createSpy('hasRole').and.returnValue(true)
  };

  beforeEach(fakeAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        MatDialogModule,
        SharedModule
      ],
      declarations: [ ReportingYearFormComponent ],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { reporting_year: 2024 } },
        { provide: PublicationService, useValue: mockPubService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuthorizationService, useValue: mockAuthService },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideStore({})
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportingYearFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
