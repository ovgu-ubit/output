import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { of } from 'rxjs';
import { RuntimeConfigService } from '../services/runtime-config.service';
import { CookieTokenService } from './cookie.token.service';
import { DemoLoginDialogComponent } from './demo-login-dialog/demo-login-dialog.component';

describe('CookieTokenService', () => {
  let cookieService: jasmine.SpyObj<CookieService>;
  let router: Partial<Router>;
  let runtimeConfigService: jasmine.SpyObj<RuntimeConfigService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let http: jasmine.SpyObj<HttpClient>;
  let location: jasmine.SpyObj<Location>;
  let service: CookieTokenService;
  let runtimeValues: Record<string, string>;

  beforeEach(() => {
    cookieService = jasmine.createSpyObj<CookieService>('CookieService', ['check', 'get']);
    router = { url: '/current' };
    runtimeConfigService = jasmine.createSpyObj<RuntimeConfigService>('RuntimeConfigService', ['getValue']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    http = jasmine.createSpyObj<HttpClient>('HttpClient', ['post']);
    location = jasmine.createSpyObj<Location>('Location', ['prepareExternalUrl']);
    location.prepareExternalUrl.and.callFake((path: string) => '/output' + (path.startsWith('/') ? path : '/' + path));
    runtimeValues = {
      authorization_service: 'cookie',
      api: 'api/',
      auth_api: 'https://auth-api/',
      auth_ui: 'https://auth-ui',
      self: 'https://output/',
    };
    runtimeConfigService.getValue.and.callFake(<T>(key: string): T => runtimeValues[key] as T);

    service = new CookieTokenService(
      cookieService,
      router as Router,
      runtimeConfigService,
      dialog,
      http,
      location,
    );
  });

  it('opens the demo login dialog in demo mode', () => {
    runtimeValues.authorization_service = 'demo';
    dialog.open.and.returnValue({ afterClosed: () => of({ success: false }) } as any);

    service.login({ url: '/publications' });

    expect(dialog.open).toHaveBeenCalledWith(DemoLoginDialogComponent, jasmine.objectContaining({
      width: '380px',
      disableClose: true,
      data: { redirectUrl: '/publications' },
    }));
  });

  it('grants inherited reader access to publication writers but not general write or admin access', () => {
    runtimeValues.security = 'true';
    cookieService.check.and.returnValue(true);
    cookieService.get.and.returnValue(JSON.stringify({
      id: 'publication-author', permissions: [{ appname: 'output', rolename: 'publication_writer' }],
    }));

    expect(service.hasRole('reader')).toBeTrue();
    expect(service.hasRole('publication_writer')).toBeTrue();
    expect(service.hasRole('writer')).toBeFalse();
    expect(service.hasRole('admin')).toBeFalse();
  });

  it('does not inherit reader access from publication-writer roles belonging to another application', () => {
    runtimeValues.security = 'true';
    cookieService.check.and.returnValue(true);
    cookieService.get.and.returnValue(JSON.stringify({
      id: 'other-author', permissions: [{ appname: 'other', rolename: 'publication_writer' }],
    }));

    expect(service.hasRole('reader')).toBeFalse();
    expect(service.hasRole('publication_writer')).toBeFalse();
  });

  it('does not grant reader access to anonymous users while authentication is enabled', () => {
    runtimeValues.security = 'true';
    cookieService.check.and.returnValue(false);
    expect(service.hasRole('reader')).toBeFalse();
  });

  it('redirects to the guarded route after successful demo login', () => {
    runtimeValues.authorization_service = 'demo';
    dialog.open.and.returnValue({ afterClosed: () => of({ success: true, redirectUrl: '/workflow' }) } as any);
    const redirectSpy = spyOn<any>(service, 'redirectTo');

    service.login({ url: '/workflow' });

    expect(redirectSpy).toHaveBeenCalledWith('/output/workflow');
  });

  it('keeps the external auth redirect outside demo mode', () => {
    const redirectSpy = spyOn<any>(service, 'redirectTo');

    service.login({ url: '/publications' });

    expect(dialog.open).not.toHaveBeenCalled();
    expect(redirectSpy).toHaveBeenCalledWith(
      'https://auth-ui/login?redirectURL=' + encodeURIComponent(window.location.origin + '/output/publications')
    );
  });

  it('redirects to the base href after demo logout', () => {
    runtimeValues.authorization_service = 'demo';
    runtimeValues.auth_api = '';
    http.post.and.returnValue(of({}) as any);
    const redirectSpy = spyOn<any>(service, 'redirectTo');

    service.logout();

    expect(http.post).toHaveBeenCalledWith('api/auth/logout', {}, { withCredentials: true });
    expect(redirectSpy).toHaveBeenCalledWith('/output/');
  });

  it('uses the base href for profile return redirects', () => {
    const redirectSpy = spyOn<any>(service, 'redirectTo');

    service.details();

    expect(redirectSpy).toHaveBeenCalledWith(
      'https://auth-ui/profile?redirectURL=' + encodeURIComponent(window.location.origin + '/output/current')
    );
  });
});
