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
import { CompareOperation } from '@output/interfaces';

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

  it('should expose contract year as a numeric filter key', () => {
    expect(component.keys).toContain(jasmine.objectContaining({
      key: 'contract_year',
      label: 'Vertragsjahr',
      type: 'number'
    }));
  });

  it('should reset the default operator when contract year is selected', () => {
    const filter = component.getFiltersControls()[0];

    expect(filter.get('compare_operator').value).toBe(CompareOperation.INCLUDES);

    filter.get('field').setValue('contract_year');
    filter.get('value').setValue('2026');

    expect(component.getFilter().expressions[0]).toEqual(jasmine.objectContaining({
      key: 'contract_year',
      comp: CompareOperation.EQUALS,
      value: '2026'
    }));
  });

  it('should pass comma separated string values as array for IN filters', () => {
    const filter = component.getFiltersControls()[0];

    filter.get('field').setValue('title');
    filter.get('compare_operator').setValue(CompareOperation.IN);
    filter.get('value').setValue('alpha, beta,gamma');

    expect(component.getFilter().expressions[0]).toEqual(jasmine.objectContaining({
      key: 'title',
      comp: CompareOperation.IN,
      value: ['alpha', 'beta', 'gamma']
    }));
  });

  it('should pass comma separated numeric values as number array for IN filters', () => {
    const filter = component.getFiltersControls()[0];

    filter.get('field').setValue('contract_year');
    filter.get('compare_operator').setValue(CompareOperation.IN);
    filter.get('value').setValue('2024,2025');

    expect(component.getFilter().expressions[0]).toEqual(jasmine.objectContaining({
      key: 'contract_year',
      comp: CompareOperation.IN,
      value: [2024, 2025]
    }));
  });
});
