import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatusesComponent } from './statuses.component';

describe('StatusesComponent', () => {
  let component: StatusesComponent;
  let fixture: ComponentFixture<StatusesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatusesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
