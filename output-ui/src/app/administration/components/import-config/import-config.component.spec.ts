import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImportConfigComponent } from './import-config.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SharedModule } from 'src/app/shared/shared.module';
import { ImportService } from 'src/app/administration/services/import.service';
import { EnrichService } from 'src/app/administration/services/enrich.service';
import { WorkflowService } from 'src/app/workflow/workflow.service';
import { of } from 'rxjs';

describe('ImportConfigComponent', () => {
  let component: ImportConfigComponent;
  let fixture: ComponentFixture<ImportConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        MatDialogModule,
        MatSnackBarModule,
        SharedModule,
        ImportConfigComponent
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: { close: () => { } } },
        { provide: MAT_DIALOG_DATA, useValue: { import: { path: '' } } },
        { provide: ImportService, useValue: { getConfigs: () => of([]), getConfig: () => of({}), setConfig: () => of({}) } },
        { provide: EnrichService, useValue: { getConfig: () => of({}), setConfig: () => of({}) } },
        { provide: WorkflowService, useValue: { getConfig: () => of({}), setConfig: () => of({}) } }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ImportConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
