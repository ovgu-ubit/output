import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportFormMappingComponent } from './import-form-mapping.component';

describe('ImportFormMappingComponent', () => {
  let component: ImportFormMappingComponent;
  let fixture: ComponentFixture<ImportFormMappingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportFormMappingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportFormMappingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
