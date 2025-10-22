import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IdTableComponent } from './id-table.component';

describe('IdTableComponent', () => {
  let component: IdTableComponent;
  let fixture: ComponentFixture<IdTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IdTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IdTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
