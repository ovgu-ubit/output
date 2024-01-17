import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeletePublicationDialogComponent } from './delete-publication-dialog.component';

describe('DeletePublicationDialogComponent', () => {
  let component: DeletePublicationDialogComponent;
  let fixture: ComponentFixture<DeletePublicationDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DeletePublicationDialogComponent]
    });
    fixture = TestBed.createComponent(DeletePublicationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
