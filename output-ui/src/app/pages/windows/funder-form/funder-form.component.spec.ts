import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FunderFormComponent } from './funder-form.component';

describe('FunderFormComponent', () => {
  let component: FunderFormComponent;
  let fixture: ComponentFixture<FunderFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FunderFormComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FunderFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
