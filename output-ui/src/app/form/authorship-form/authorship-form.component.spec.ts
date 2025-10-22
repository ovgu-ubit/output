import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthorshipFormComponent } from './authorship-form.component';

describe('AuthorshipFormComponent', () => {
  let component: AuthorshipFormComponent;
  let fixture: ComponentFixture<AuthorshipFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AuthorshipFormComponent]
    });
    fixture = TestBed.createComponent(AuthorshipFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
