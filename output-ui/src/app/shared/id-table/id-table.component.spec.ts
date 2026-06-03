import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatTableModule } from '@angular/material/table';
import { SharedModule } from 'src/app/shared/shared.module';

import { IdTableComponent } from './id-table.component';

describe('IdTableComponent', () => {
  let component: IdTableComponent<any>;
  let fixture: ComponentFixture<IdTableComponent<any>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        ReactiveFormsModule,
        MatTableModule,
        SharedModule
      ],
      declarations: [IdTableComponent],
      providers: [
        FormBuilder
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IdTableComponent);
    component = fixture.componentInstance;
    component.entity = { id: 1, identifiers: [] };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
