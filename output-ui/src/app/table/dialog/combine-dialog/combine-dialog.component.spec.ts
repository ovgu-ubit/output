import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CombineDialogComponent } from './combine-dialog.component';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { SharedModule } from 'src/app/shared/shared.module';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('CombineDialogComponent', () => {
  let component: CombineDialogComponent<any>;
  let fixture: ComponentFixture<CombineDialogComponent<any>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatDialogModule, SharedModule, NoopAnimationsModule],
      declarations: [ CombineDialogComponent ],
      providers: [
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: { ents: [{ id: 1, label: 'A' }, { id: 2, label: 'B' }] } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CombineDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
