import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PubTypeFormComponent } from './pub-type-form.component';

describe('PubTypeFormComponent', () => {
  let component: PubTypeFormComponent;
  let fixture: ComponentFixture<PubTypeFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PubTypeFormComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PubTypeFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
