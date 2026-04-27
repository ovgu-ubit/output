import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ConfigService } from 'src/app/administration/services/config.service';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SharedModule } from 'src/app/shared/shared.module';

import { FilterViewComponent } from './filter-view.component';

describe('FilterViewComponent', () => {
  let component: FilterViewComponent;
  let fixture: ComponentFixture<FilterViewComponent>;

  const mockDialogRef = {
    close: jasmine.createSpy('close')
  };

  const mockPublicationService = {
    getFilters: jasmine.createSpy('getFilters').and.returnValue(of([])),
    getReportingYears: jasmine.createSpy('getReportingYears').and.returnValue(of([]))
  };

  const mockConfigService = {
    get: jasmine.createSpy('get').and.returnValue(of({ value: {} }))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ 
        FilterViewComponent, 
        NoopAnimationsModule,
        ReactiveFormsModule,
        MatDialogModule,
        SharedModule
      ],
      providers: [
        FormBuilder,
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { hideSavedFilters: true } },
        { provide: PublicationService, useValue: mockPublicationService },
        { provide: ConfigService, useValue: mockConfigService },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FilterViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
