import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportWorkflowFormComponent } from './import-workflow-form.component';

describe('ImportWorkflowFormComponent', () => {
  let component: ImportWorkflowFormComponent;
  let fixture: ComponentFixture<ImportWorkflowFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportWorkflowFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportWorkflowFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
