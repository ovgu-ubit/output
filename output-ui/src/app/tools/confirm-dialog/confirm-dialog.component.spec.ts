import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { ConfirmDialogComponent, ConfirmDialogModel } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  const mockDialogRef = {
    close: jasmine.createSpy('close')
  };
  const model: ConfirmDialogModel = {
    title: 'Delete',
    message: 'Sind Sie sicher?',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MatDialogModule
      ],
      providers : [
        {
          provide: MatDialogRef,
          useValue: mockDialogRef
        }, {
          // I was expecting this will pass the desired value
          provide: MAT_DIALOG_DATA,
          useValue: model
        }
      ],
      declarations: [ ConfirmDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
