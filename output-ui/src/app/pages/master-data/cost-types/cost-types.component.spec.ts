import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CostTypesComponent } from './cost-types.component';

describe('CostTypesComponent', () => {
  let component: CostTypesComponent;
  let fixture: ComponentFixture<CostTypesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CostTypesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CostTypesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
