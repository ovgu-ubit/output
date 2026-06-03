import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CsvFormatComponent } from './csv-format.component';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { SharedModule } from 'src/app/shared/shared.module';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ImportService } from 'src/app/administration/services/import.service';
import { ConfigService } from '../../services/config.service';
import { of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('CsvFormatComponent', () => {
  let component: CsvFormatComponent;
  let fixture: ComponentFixture<CsvFormatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedModule, NoopAnimationsModule, ReactiveFormsModule, MatDialogModule],
      declarations: [ CsvFormatComponent ],
      providers: [
        FormBuilder,
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: MAT_DIALOG_DATA, useValue: { path: 'test.csv', csvFormat: null } },
        { provide: ImportService, useValue: { getCSVMappings: () => of([]), setCSVMapping: () => of({}), deleteCSVMapping: () => of({}) } },
        { provide: ConfigService, useValue: { get: () => of({ value: {} }) } },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CsvFormatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
