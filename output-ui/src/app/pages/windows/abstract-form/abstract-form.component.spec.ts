import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AbstractFormComponent } from './abstract-form.component';

describe('AbstractFormComponent', () => {
  let component: AbstractFormComponent<any>;
  let fixture: ComponentFixture<AbstractFormComponent<any>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AbstractFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AbstractFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
