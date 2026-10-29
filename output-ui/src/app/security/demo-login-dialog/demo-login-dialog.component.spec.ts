import type { MockedObject } from "vitest";
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, firstValueFrom, tap } from 'rxjs';
import { DemoInfoComponent } from '../../demo-info/demo-info.component';
import { RuntimeConfigService } from '../../services/runtime-config.service';
import { SharedModule } from '../../shared/shared.module';
import { DemoLoginDialogComponent } from './demo-login-dialog.component';

describe('DemoLoginDialogComponent', () => {
    let fixture: ComponentFixture<DemoLoginDialogComponent>;
    let component: DemoLoginDialogComponent;
    let httpMock: HttpTestingController;
    let dialogRef: MockedObject<Pick<MatDialogRef<DemoLoginDialogComponent>, 'close'>>;
    let runtimeConfigService: MockedObject<Pick<RuntimeConfigService, 'getValue'>>;

    beforeEach(async () => {
        dialogRef = {
            close: vi.fn().mockName("MatDialogRef.close")
        };
        runtimeConfigService = {
            getValue: vi.fn().mockName("RuntimeConfigService.getValue")
        };
        runtimeConfigService.getValue.mockImplementation(<T>(key: string): T => {
            if (key === 'auth_api')
                return '' as T;
            if (key === 'api')
                return 'api/' as T;
            return null as T;
        });

        await TestBed.configureTestingModule({
            declarations: [DemoLoginDialogComponent, DemoInfoComponent],
            imports: [SharedModule, NoopAnimationsModule, RouterModule.forRoot([
                { path: 'demo-info', component: DemoInfoComponent }
            ])],
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                { provide: MatDialogRef, useValue: dialogRef },
                { provide: MAT_DIALOG_DATA, useValue: { redirectUrl: '/publications' } },
                { provide: RuntimeConfigService, useValue: runtimeConfigService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(DemoLoginDialogComponent);
        component = fixture.componentInstance;
        httpMock = TestBed.inject(HttpTestingController);
        fixture.detectChanges();
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('posts credentials to the demo login endpoint', () => {
        component.form.setValue({ username: 'demo', password: 'secret' });

        component.login();

        const request = httpMock.expectOne('api/auth/login');
        expect(request.request.method).toBe('POST');
        expect(request.request.withCredentials).toBe(true);
        expect(request.request.body).toEqual({ username: 'demo', password: 'secret' });

        request.flush({ id: 'demo', permissions: [{ appname: 'output', rolename: 'admin' }] });

        expect(dialogRef.close).toHaveBeenCalledWith({ success: true, redirectUrl: '/publications' });
    });

    it('shows a neutral login error on unauthorized responses', () => {
        component.form.setValue({ username: 'demo', password: 'wrong' });

        component.login();

        const request = httpMock.expectOne('api/auth/login');
        request.flush({}, { status: 401, statusText: 'Unauthorized' });

        expect(component.errorMessage).toBe('Anmeldung fehlgeschlagen.');
        expect(component.isSubmitting).toBe(false);
        expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('closes the dialog before navigating to demo info', async () => {
        const router = TestBed.inject(Router);
        const navigation = firstValueFrom(router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            tap(() => expect(dialogRef.close).toHaveBeenCalledWith({ success: false }))
        ));
        const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a[routerLink="/demo-info"]');

        link.click();

        expect(dialogRef.close).toHaveBeenCalledWith({ success: false });
        await navigation;
        expect(router.url).toBe('/demo-info');
    });
});
