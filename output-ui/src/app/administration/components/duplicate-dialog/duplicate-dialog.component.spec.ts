import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DuplicateDialogComponent } from './duplicate-dialog.component';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SharedModule } from 'src/app/shared/shared.module';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { of, throwError } from 'rxjs';
import {  ApiErrorCode  } from '@output/interfaces';
import { PublicationDuplicateService } from 'src/app/services/entities/duplicate.service';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { ConfirmDialogComponent } from 'src/app/shared/confirm-dialog/confirm-dialog.component';

describe('DuplicateDialogComponent', () => {
  let component: DuplicateDialogComponent;
  let fixture: ComponentFixture<DuplicateDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<DuplicateDialogComponent>>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let duplicateService: jasmine.SpyObj<PublicationDuplicateService>;
  let publicationService: jasmine.SpyObj<PublicationService>;
  let errorPresentation: jasmine.SpyObj<ErrorPresentationService>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<DuplicateDialogComponent>>('MatDialogRef', ['close']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    duplicateService = jasmine.createSpyObj<PublicationDuplicateService>('PublicationDuplicateService', ['getOne', 'delete', 'update']);
    duplicateService.getOne.and.returnValue(of({ id: 1, id_first: 1, id_second: 2 } as any));
    publicationService = jasmine.createSpyObj<PublicationService>('PublicationService', ['getOne', 'combine', 'update']);
    publicationService.getOne.and.returnValues(of({ id: 1 } as any), of({ id: 2 } as any));
    errorPresentation = jasmine.createSpyObj<ErrorPresentationService>('ErrorPresentationService', ['present']);

    await TestBed.configureTestingModule({
      imports: [MatDialogModule, SharedModule, NoopAnimationsModule],
      declarations: [ DuplicateDialogComponent ],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { entity: { id: 1 } } },
        { provide: MatDialog, useValue: dialog },
        { provide: PublicationDuplicateService, useValue: duplicateService },
        { provide: PublicationService, useValue: publicationService },
        { provide: ErrorPresentationService, useValue: errorPresentation },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideStore({})
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DuplicateDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('retries combine with ignored locks after the user confirms', () => {
    component.dupl = { id: 7 } as any;
    component.ent1 = { id: 1 } as any;
    component.ent2 = { id: 2 } as any;
    publicationService.combine.and.returnValues(
      throwError(() => new HttpErrorResponse({
        status: 409,
        error: {
          statusCode: 409,
          code: ApiErrorCode.ENTITY_LOCKED,
          message: 'Entity is currently locked.',
        },
      })),
      of({ id: 1 } as any),
    );
    dialog.open.and.returnValue({ afterClosed: () => of({ soft: false }) } as any);

    component.action(0);

    expect(dialog.open).toHaveBeenCalledWith(ConfirmDialogComponent, jasmine.objectContaining({
      maxWidth: '400px',
    }));
    expect(publicationService.combine.calls.allArgs()).toEqual([
      [1, [2], undefined],
      [1, [2], { ignoreLocks: true }],
    ]);
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 7, updated: true });
    expect(errorPresentation.present).not.toHaveBeenCalled();
  });
});
