import type { MockedObject } from "vitest";
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DuplicateDialogComponent } from './duplicate-dialog.component';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SharedModule } from 'src/app/shared/shared.module';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpErrorResponse, provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { of, throwError } from 'rxjs';
import { ApiErrorCode } from '@output/interfaces';
import { PublicationDuplicateService } from 'src/app/services/entities/duplicate.service';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { ConfirmDialogComponent } from 'src/app/shared/confirm-dialog/confirm-dialog.component';

describe('DuplicateDialogComponent', () => {
    let component: DuplicateDialogComponent;
    let fixture: ComponentFixture<DuplicateDialogComponent>;
    let dialogRef: MockedObject<Pick<MatDialogRef<DuplicateDialogComponent>, 'close'>>;
    let dialog: MockedObject<Pick<MatDialog, 'open'>>;
    let duplicateService: MockedObject<Pick<PublicationDuplicateService, 'getOne' | 'delete' | 'update'>>;
    let publicationService: MockedObject<Pick<PublicationService, 'getOne' | 'combine' | 'update'>>;
    let errorPresentation: MockedObject<Pick<ErrorPresentationService, 'present'>>;

    beforeEach(async () => {
        dialogRef = {
            close: vi.fn().mockName("MatDialogRef.close")
        };
        dialog = {
            open: vi.fn().mockName("MatDialog.open")
        };
        duplicateService = {
            getOne: vi.fn().mockName("PublicationDuplicateService.getOne"),
            delete: vi.fn().mockName("PublicationDuplicateService.delete"),
            update: vi.fn().mockName("PublicationDuplicateService.update")
        };
        duplicateService.getOne.mockReturnValue(of({ id: 1, id_first: 1, id_second: 2 } as any));
        publicationService = {
            getOne: vi.fn().mockName("PublicationService.getOne"),
            combine: vi.fn().mockName("PublicationService.combine"),
            update: vi.fn().mockName("PublicationService.update")
        };
        publicationService.getOne.mockReturnValueOnce(of({ id: 1 } as any)).mockReturnValueOnce(of({ id: 2 } as any));
        errorPresentation = {
            present: vi.fn().mockName("ErrorPresentationService.present")
        };

        await TestBed.configureTestingModule({
            imports: [MatDialogModule, SharedModule, NoopAnimationsModule],
            declarations: [DuplicateDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: dialogRef },
                { provide: MAT_DIALOG_DATA, useValue: { entity: { id: 1 } } },
                { provide: MatDialog, useValue: dialog },
                { provide: PublicationDuplicateService, useValue: duplicateService },
                { provide: PublicationService, useValue: publicationService },
                { provide: ErrorPresentationService, useValue: errorPresentation },
                provideHttpClient(withXhr()),
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
        publicationService.combine.mockReturnValueOnce(throwError(() => new HttpErrorResponse({
            status: 409,
            error: {
                statusCode: 409,
                code: ApiErrorCode.ENTITY_LOCKED,
                message: 'Entity is currently locked.',
            },
        }))).mockReturnValueOnce(of({ id: 1 } as any));
        dialog.open.mockReturnValue({ afterClosed: () => of({ soft: false }) } as any);

        component.action(0);

        expect(dialog.open).toHaveBeenCalledWith(ConfirmDialogComponent, expect.objectContaining({
            maxWidth: '400px',
        }));
        expect(vi.mocked(publicationService.combine).mock.calls).toEqual([
            [1, [2], undefined],
            [1, [2], { ignoreLocks: true }],
        ]);
        expect(dialogRef.close).toHaveBeenCalledWith({ id: 7, updated: true });
        expect(errorPresentation.present).not.toHaveBeenCalled();
    });
});
