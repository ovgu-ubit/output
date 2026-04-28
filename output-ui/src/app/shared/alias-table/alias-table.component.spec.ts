import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatTableModule } from '@angular/material/table';
import { SharedModule } from 'src/app/shared/shared.module';

import { AliasTableComponent } from './alias-table.component';

describe('AliasTableComponent', () => {
  let component: AliasTableComponent<any>;
  let fixture: ComponentFixture<AliasTableComponent<any>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        ReactiveFormsModule,
        MatTableModule,
        SharedModule
      ],
      declarations: [AliasTableComponent],
      providers: [
        FormBuilder
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AliasTableComponent);
    component = fixture.componentInstance;
    component.entity = { id: 1, aliases: [] };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
