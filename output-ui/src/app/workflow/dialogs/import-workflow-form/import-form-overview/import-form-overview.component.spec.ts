import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportFormOverviewComponent } from './import-form-overview.component';

describe('ImportFormOverviewComponent', () => {
  let component: ImportFormOverviewComponent;
  let fixture: ComponentFixture<ImportFormOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportFormOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportFormOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
