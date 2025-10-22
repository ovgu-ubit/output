import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportingYearFormComponent } from './reporting-year-form.component';

describe('ReportingYearFormComponent', () => {
  let component: ReportingYearFormComponent;
  let fixture: ComponentFixture<ReportingYearFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReportingYearFormComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportingYearFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
