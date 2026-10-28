import type { MockedObject } from "vitest";
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { SharedModule } from 'src/app/shared/shared.module';

import { AbstractFormComponent } from './abstract-form.component';

describe('AbstractFormComponent', () => {
    let component: AbstractFormComponent<any>;
    let fixture: ComponentFixture<AbstractFormComponent<any>>;
    let dialogRef: MockedObject<Pick<MatDialogRef<any>, 'close'>>;
    let dialog: MockedObject<Pick<MatDialog, 'open'>>;
    let errorPresentation: MockedObject<Pick<ErrorPresentationService, 'clearFieldErrors' | 'applyFieldErrors' | 'present'>>;
    let tokenService: MockedObject<Pick<AuthorizationService, 'hasRole'>>;

    beforeEach(async () => {
        dialogRef = {
            close: vi.fn().mockName("MatDialogRef.close")
        };
        dialog = {
            open: vi.fn().mockName("MatDialog.open")
        };
        errorPresentation = {
            clearFieldErrors: vi.fn().mockName("ErrorPresentationService.clearFieldErrors"),
            applyFieldErrors: vi.fn().mockName("ErrorPresentationService.applyFieldErrors"),
            present: vi.fn().mockName("ErrorPresentationService.present")
        };
        tokenService = {
            hasRole: vi.fn().mockName("AuthorizationService.hasRole")
        };
        tokenService.hasRole.mockReturnValue(true);

        await TestBed.configureTestingModule({
            imports: [
                NoopAnimationsModule,
                ReactiveFormsModule,
                MatDialogModule,
                MatSnackBarModule,
                SharedModule
            ],
            declarations: [AbstractFormComponent],
            providers: [
                FormBuilder,
                { provide: MatDialog, useValue: dialog },
                { provide: MatSnackBar, useValue: {
                        open: vi.fn().mockName("MatSnackBar.open")
                    } },
                { provide: ErrorPresentationService, useValue: errorPresentation },
                { provide: AuthorizationService, useValue: tokenService },
                { provide: PublisherService, useValue: {} },
                { provide: CostTypeService, useValue: {} },
                provideHttpClient(withXhr()),
                provideHttpClientTesting()
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(AbstractFormComponent);
        component = fixture.componentInstance;
        component.fields = [{ key: 'label', title: 'Label', required: true }];
        component.data = { entity: {} };
        component.dialogRef = dialogRef as unknown as typeof component.dialogRef;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('returns deferred dialog data by default even when a service exists', async () => {
        component.service = {
            add: vi.fn().mockName("EntityService.add"),
            update: vi.fn().mockName("EntityService.update")
        } as unknown as typeof component.service;
        component.form.get('label')?.setValue('Invoice draft');

        await component.action();

        expect(component.service.add).not.toHaveBeenCalled();
        expect(dialogRef.close).toHaveBeenCalledWith(expect.objectContaining({
            label: 'Invoice draft',
            updated: true,
        }));
    });

    it('persists through the service when persistOnSave is enabled by the caller', async () => {
        const service = {
            add: vi.fn().mockName("EntityService.add"),
            update: vi.fn().mockName("EntityService.update")
        };
        service.add.mockReturnValue(of({ id: 42, label: 'Institute' }));
        component.service = service as unknown as typeof component.service;
        component.data = { entity: {}, persistOnSave: true };
        component.form.get('label')?.setValue('Institute');

        await component.action();

        expect(service.add).toHaveBeenCalledWith(expect.objectContaining({
            label: 'Institute',
        }));
        expect(dialogRef.close).toHaveBeenCalledWith({
            persisted: true,
            mode: 'create',
            entity: { id: 42, label: 'Institute' },
        });
    });

    it('preserves status id 0 when creating persisted entities', async () => {
        const service = {
            add: vi.fn().mockName("EntityService.add"),
            update: vi.fn().mockName("EntityService.update")
        };
        service.add.mockReturnValue(of({ id: 0, label: 'New status' }));
        component.service = service as unknown as typeof component.service;
        component.data = { entity: {}, persistOnSave: true };
        component.entity = {};
        component.fields = [
            { key: 'id', title: 'Status', type: 'status', required: true },
            { key: 'label', title: 'Label', required: true },
        ];
        component.form.addControl('id', new FormControl(0));
        component.form.get('label')?.setValue('New status');

        await component.action();

        expect(service.add).toHaveBeenCalledWith(expect.objectContaining({
            id: 0,
            label: 'New status',
        }));
        expect(service.update).not.toHaveBeenCalled();
    });

    it('treats entity id 0 as an existing entity when saving', async () => {
        const service = {
            add: vi.fn().mockName("EntityService.add"),
            update: vi.fn().mockName("EntityService.update")
        };
        service.update.mockReturnValue(of({ id: 0, label: 'Existing status' }));
        component.service = service as unknown as typeof component.service;
        component.data = { entity: { id: 0 }, persistOnSave: true };
        component.entity = { id: 0 };
        component.fields = [
            { key: 'id', title: 'Status', type: 'status', required: true },
            { key: 'label', title: 'Label', required: true },
        ];
        component.form.addControl('id', new FormControl(0));
        component.form.get('label')?.setValue('Existing status');

        await component.action();

        expect(service.update).toHaveBeenCalledWith(expect.objectContaining({
            id: 0,
            label: 'Existing status',
            locked_at: null,
        }));
        expect(service.add).not.toHaveBeenCalled();
    });

    it('releases the edit lock when a writable read-only form is closed', () => {
        component.service = {
            add: vi.fn().mockName("EntityService.add"),
            update: vi.fn().mockName("EntityService.update")
        } as unknown as typeof component.service;
        component.entity = { id: 7, label: 'Contract' };
        tokenService.hasRole.mockImplementation((role: string) => role === 'writer');

        component.close();

        expect(dialogRef.close).toHaveBeenCalledWith({ id: 7, locked_at: null });
    });

    it('does not release locks on close when the loaded entity is already locked elsewhere', () => {
        component.service = {
            add: vi.fn().mockName("EntityService.add"),
            update: vi.fn().mockName("EntityService.update")
        } as unknown as typeof component.service;
        component.entity = { id: 7, label: 'Contract', locked_at: new Date('2026-04-10T10:00:00Z') };
        tokenService.hasRole.mockImplementation((role: string) => role === 'writer');

        component.close();

        expect(dialogRef.close).toHaveBeenCalledWith(null);
    });
});
