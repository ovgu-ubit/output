import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectInstituteDialogComponent } from './select-institute-dialog.component';

describe('SelectInstituteDialogComponent', () => {
  let component: SelectInstituteDialogComponent;
  let fixture: ComponentFixture<SelectInstituteDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SelectInstituteDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectInstituteDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
