import type { MockedObject } from "vitest";
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';

import { SelectEntityComponent } from './select-entity.component';

describe('SelectEntityComponent', () => {
    let component: SelectEntityComponent<any>;
    let fixture: ComponentFixture<SelectEntityComponent<any>>;
    let dialog: MockedObject<Pick<MatDialog, 'open'>>;
    let errorPresentation: MockedObject<Pick<ErrorPresentationService, 'present'>>;

    beforeEach(async () => {
        dialog = {
            open: vi.fn().mockName("MatDialog.open")
        };
        errorPresentation = {
            present: vi.fn().mockName("ErrorPresentationService.present")
        };

        await TestBed.configureTestingModule({
            imports: [ReactiveFormsModule],
            declarations: [SelectEntityComponent],
            providers: [
                { provide: MatDialog, useValue: dialog },
                { provide: MatSnackBar, useValue: {
                        open: vi.fn().mockName("MatSnackBar.open")
                    } },
                { provide: ErrorPresentationService, useValue: errorPresentation },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        })
            .overrideComponent(SelectEntityComponent, {
            set: { template: '' }
        })
            .compileComponents();

        fixture = TestBed.createComponent(SelectEntityComponent);
        component = fixture.componentInstance;
        component.formComponent = {} as any;
        component.name = 'Vertrag';
        fixture.detectChanges();
    });

    it('opens disabled entity dialogs as locked views and releases the lock on close', () => {
        const service = {
            update: vi.fn().mockName("EntityService.update")
        };
        service.update.mockReturnValue(of({}));
        dialog.open.mockReturnValue({
            afterClosed: () => of({ id: 7, locked_at: null }),
        } as any);

        component.disabled = true;
        component.ent = { id: 7, label: 'Contract' };
        component.serviceClass = service as unknown as typeof component.serviceClass;

        component.select({ value: 'Contract' });

        expect(dialog.open).toHaveBeenCalledWith(component.formComponent, expect.objectContaining({
            disableClose: true,
            data: expect.objectContaining({
                entity: component.ent,
                locked: true,
            }),
        }));
        expect(service.update).toHaveBeenCalledWith({ id: 7, locked_at: null });
    });

    it('ignores disabled dialog closes without an unlock payload', () => {
        const service = {
            update: vi.fn().mockName("EntityService.update")
        };
        dialog.open.mockReturnValue({
            afterClosed: () => of(null),
        } as any);

        component.disabled = true;
        component.ent = { id: 7, label: 'Contract' };
        component.serviceClass = service as unknown as typeof component.serviceClass;

        component.select({ value: 'Contract' });

        expect(service.update).not.toHaveBeenCalled();
    });
});
