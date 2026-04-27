import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogDialogComponent } from './log-dialog.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

describe('LogDialogComponent', () => {
  let component: LogDialogComponent;
  let fixture: ComponentFixture<LogDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ LogDialogComponent ],
      providers: [
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: { data: '', label: '' } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LogDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
