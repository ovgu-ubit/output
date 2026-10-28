import type { MockedObject } from "vitest";
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { of } from 'rxjs';
import { RuntimeConfigService } from '../services/runtime-config.service';
import { CookieTokenService } from './cookie.token.service';
import { DemoLoginDialogComponent } from './demo-login-dialog/demo-login-dialog.component';

type RedirectTarget = { redirectTo(url: string): void };

describe('CookieTokenService', () => {
    let cookieService: MockedObject<Pick<CookieService, 'check' | 'get'>>;
    let router: Partial<Router>;
    let runtimeConfigService: MockedObject<Pick<RuntimeConfigService, 'getValue'>>;
    let dialog: MockedObject<Pick<MatDialog, 'open'>>;
    let http: MockedObject<Pick<HttpClient, 'post'>>;
    let location: MockedObject<Pick<Location, 'prepareExternalUrl'>>;
    let service: CookieTokenService;
    let runtimeValues: Record<string, string>;

    beforeEach(() => {
        cookieService = {
            check: vi.fn().mockName("CookieService.check"),
            get: vi.fn().mockName("CookieService.get")
        };
        router = { url: '/current' };
        runtimeConfigService = {
            getValue: vi.fn().mockName("RuntimeConfigService.getValue")
        };
        dialog = {
            open: vi.fn().mockName("MatDialog.open")
        };
        http = {
            post: vi.fn().mockName("HttpClient.post")
        };
        location = {
            prepareExternalUrl: vi.fn().mockName("Location.prepareExternalUrl")
        };
        location.prepareExternalUrl.mockImplementation((path: string) => '/output' + (path.startsWith('/') ? path : '/' + path));
        runtimeValues = {
            authorization_service: 'cookie',
            api: 'api/',
            auth_api: 'https://auth-api/',
            auth_ui: 'https://auth-ui',
            self: 'https://output/',
        };
        runtimeConfigService.getValue.mockImplementation(<T>(key: string): T => runtimeValues[key] as T);

        service = new CookieTokenService(
            cookieService as unknown as CookieService,
            router as Router,
            runtimeConfigService as unknown as RuntimeConfigService,
            dialog as unknown as MatDialog,
            http as unknown as HttpClient,
            location as unknown as Location
        );
    });

    it('opens the demo login dialog in demo mode', () => {
        runtimeValues.authorization_service = 'demo';
        dialog.open.mockReturnValue({ afterClosed: () => of({ success: false }) } as any);

        service.login({ url: '/publications' });

        expect(dialog.open).toHaveBeenCalledWith(DemoLoginDialogComponent, expect.objectContaining({
            width: '380px',
            disableClose: true,
            data: { redirectUrl: '/publications' },
        }));
    });

    it('grants inherited reader access to publication writers but not general write or admin access', () => {
        runtimeValues.security = 'true';
        cookieService.check.mockReturnValue(true);
        cookieService.get.mockReturnValue(JSON.stringify({
            id: 'publication-author', permissions: [{ appname: 'output', rolename: 'publication_writer' }],
        }));

        expect(service.hasRole('reader')).toBe(true);
        expect(service.hasRole('publication_writer')).toBe(true);
        expect(service.hasRole('writer')).toBe(false);
        expect(service.hasRole('admin')).toBe(false);
    });

    it('does not inherit reader access from publication-writer roles belonging to another application', () => {
        runtimeValues.security = 'true';
        cookieService.check.mockReturnValue(true);
        cookieService.get.mockReturnValue(JSON.stringify({
            id: 'other-author', permissions: [{ appname: 'other', rolename: 'publication_writer' }],
        }));

        expect(service.hasRole('reader')).toBe(false);
        expect(service.hasRole('publication_writer')).toBe(false);
    });

    it('does not grant reader access to anonymous users while authentication is enabled', () => {
        runtimeValues.security = 'true';
        cookieService.check.mockReturnValue(false);
        expect(service.hasRole('reader')).toBe(false);
    });

    it('redirects to the guarded route after successful demo login', () => {
        runtimeValues.authorization_service = 'demo';
        dialog.open.mockReturnValue({ afterClosed: () => of({ success: true, redirectUrl: '/workflow' }) } as any);
        const redirectSpy = vi.spyOn(service as unknown as RedirectTarget, 'redirectTo').mockReturnValue(undefined);

        service.login({ url: '/workflow' });

        expect(redirectSpy).toHaveBeenCalledWith('/output/workflow');
    });

    it('keeps the external auth redirect outside demo mode', () => {
        const redirectSpy = vi.spyOn(service as unknown as RedirectTarget, 'redirectTo').mockReturnValue(undefined);

        service.login({ url: '/publications' });

        expect(dialog.open).not.toHaveBeenCalled();
        expect(redirectSpy).toHaveBeenCalledWith('https://auth-ui/login?redirectURL=' + encodeURIComponent(window.location.origin + '/output/publications'));
    });

    it('redirects to the base href after demo logout', () => {
        runtimeValues.authorization_service = 'demo';
        runtimeValues.auth_api = '';
        http.post.mockReturnValue(of({}) as any);
        const redirectSpy = vi.spyOn(service as unknown as RedirectTarget, 'redirectTo').mockReturnValue(undefined);

        service.logout();

        expect(http.post).toHaveBeenCalledWith('api/auth/logout', {}, { withCredentials: true });
        expect(redirectSpy).toHaveBeenCalledWith('/output/');
    });

    it('uses the base href for profile return redirects', () => {
        const redirectSpy = vi.spyOn(service as unknown as RedirectTarget, 'redirectTo').mockReturnValue(undefined);

        service.details();

        expect(redirectSpy).toHaveBeenCalledWith('https://auth-ui/profile?redirectURL=' + encodeURIComponent(window.location.origin + '/output/current'));
    });
});
