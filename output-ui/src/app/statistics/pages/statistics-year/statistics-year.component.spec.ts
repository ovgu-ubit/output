import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatisticsYearComponent } from './statistics-year.component';

describe('StatisticsYearComponent', () => {
  let component: StatisticsYearComponent;
  let fixture: ComponentFixture<StatisticsYearComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StatisticsYearComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatisticsYearComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
