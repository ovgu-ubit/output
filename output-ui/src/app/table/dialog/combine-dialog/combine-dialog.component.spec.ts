import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CombineDialogComponent } from './combine-dialog.component';

describe('CombineDialogComponent', () => {
  let component: CombineDialogComponent<any>;
  let fixture: ComponentFixture<CombineDialogComponent<any>>;

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
