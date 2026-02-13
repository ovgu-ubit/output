import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicationImportComponent } from './publication-import.component';

describe('PublicationImportComponent', () => {
  let component: PublicationImportComponent;
  let fixture: ComponentFixture<PublicationImportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicationImportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PublicationImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
