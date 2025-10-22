import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CostItemFormComponent } from './cost-item-form.component';

describe('CostItemFormComponent', () => {
  let component: CostItemFormComponent;
  let fixture: ComponentFixture<CostItemFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CostItemFormComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CostItemFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
