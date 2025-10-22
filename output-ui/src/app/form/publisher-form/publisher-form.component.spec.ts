import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublisherFormComponent } from './publisher-form.component';

describe('PublisherFormComponent', () => {
  let component: PublisherFormComponent;
  let fixture: ComponentFixture<PublisherFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PublisherFormComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PublisherFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
