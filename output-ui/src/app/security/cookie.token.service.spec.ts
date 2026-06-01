import { HttpClient } from '@angular/common/http';
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
  let service: CookieTokenService;
  let runtimeValues: Record<string, string>;

  beforeEach(() => {
    cookieService = jasmine.createSpyObj<CookieService>('CookieService', ['check', 'get']);
    router = { url: '/current' };
    runtimeConfigService = jasmine.createSpyObj<RuntimeConfigService>('RuntimeConfigService', ['getValue']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    http = jasmine.createSpyObj<HttpClient>('HttpClient', ['post']);
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

  it('redirects to the guarded route after successful demo login', () => {
    runtimeValues.authorization_service = 'demo';
    dialog.open.and.returnValue({ afterClosed: () => of({ success: true, redirectUrl: '/workflow' }) } as any);
    const redirectSpy = spyOn<any>(service, 'redirectTo');

    service.login({ url: '/workflow' });

    expect(redirectSpy).toHaveBeenCalledWith('/workflow');
  });

  it('keeps the external auth redirect outside demo mode', () => {
    const redirectSpy = spyOn<any>(service, 'redirectTo');

    service.login({ url: '/publications' });

    expect(dialog.open).not.toHaveBeenCalled();
    expect(redirectSpy).toHaveBeenCalledWith('https://auth-ui/login?redirectURL=https://output//publications');
  });
});
