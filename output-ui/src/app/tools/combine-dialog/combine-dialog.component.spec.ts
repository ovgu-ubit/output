import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CombineDialogComponent } from './combine-dialog.component';

describe('CombineDialogComponent', () => {
  let component: CombineDialogComponent;
  let fixture: ComponentFixture<CombineDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CombineDialogComponent ]
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
