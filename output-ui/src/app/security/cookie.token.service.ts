import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { CookieService } from 'ngx-cookie-service';
import { AuthorizationService } from './authorization.service';
import { Router } from '@angular/router';
import { RuntimeConfigService } from '../services/runtime-config.service';
import { DemoLoginDialogComponent, DemoLoginDialogResult } from './demo-login-dialog/demo-login-dialog.component';
const COOKIE_DETAILS = 'auth-details';

@Injectable({
  providedIn: 'root'
})
export class CookieTokenService extends AuthorizationService {
  constructor(
    private cookieService: CookieService,
    private router: Router,
    private runtimeConfigService: RuntimeConfigService,
    private dialog: MatDialog,
    private http: HttpClient,
    private location: Location,
  ) { super(); }

  public override isValid(): boolean {
    return this.cookieService.check(COOKIE_DETAILS);
  }

  public override getUser(): string | null {
    try {
      if (!this.isValid()) return null;
      let details = JSON.parse(this.cookieService.get(COOKIE_DETAILS));
      return details.id;
    } catch (err) { return null; }
  }

  public override getPermissions(): { rolename: string, appname: string | null }[] | null {
    let details = JSON.parse(this.cookieService.get(COOKIE_DETAILS));
    if (!details) return null;
    else return details.permissions;
  }

  public override hasRole(rolename: string) {
    if (!this.runtimeConfigService.getValue('security')) return true;
    else return this.getUser() && this.getPermissions()?.some((v, i, a) => (v['appname'] === 'output' && v['rolename'] === rolename) || (v['appname'] === null && v['rolename'] === 'admin'));
  }

  public override login(state) {
    const redirectUrl = this.getRequestedPath(state);

    if (this.isDemoAuth()) {
      const dialogRef = this.dialog.open(DemoLoginDialogComponent, {
        width: '380px',
        disableClose: true,
        data: { redirectUrl }
      });
      dialogRef.afterClosed().subscribe((result?: DemoLoginDialogResult) => {
        if (!result?.success) return;
        this.redirectToAppPath(result.redirectUrl || redirectUrl);
      });
      return;
    }

    this.redirectTo(this.getAuthUiBaseUrl() + 'login?redirectURL=' + encodeURIComponent(this.getAbsoluteAppUrl(redirectUrl)));
  }

  public override logout() {
    if (this.isDemoAuth()) {
      this.http.post(this.getAuthBaseUrl() + 'auth/logout', {}, { withCredentials: true }).subscribe({
        next: () => this.redirectToAppPath('/'),
        error: () => this.redirectToAppPath('/'),
      });
      return;
    }

    this.redirectTo(this.runtimeConfigService.getValue('auth_api') + 'auth/logout');
  }

  public override details() {
    if (this.isDemoAuth()) return;
    this.redirectTo(this.getAuthUiBaseUrl() + 'profile?redirectURL=' + encodeURIComponent(this.getAbsoluteAppUrl(this.router.url)));
  }

  private isDemoAuth(): boolean {
    return this.runtimeConfigService.getValue('authorization_service') === 'demo';
  }

  private getAuthBaseUrl(): string {
    return this.runtimeConfigService.getValue<string>('auth_api') || this.runtimeConfigService.getValue<string>('api');
  }

  private getAuthUiBaseUrl(): string {
    return this.withTrailingSlash(this.runtimeConfigService.getValue<string>('auth_ui') || '');
  }

  private getRequestedPath(state?: { url?: string }): string {
    return state?.url || this.router.url || '/';
  }

  private getAbsoluteAppUrl(path: string): string {
    return new URL(this.location.prepareExternalUrl(path || '/'), window.location.origin).toString();
  }

  private redirectToAppPath(path: string): void {
    this.redirectTo(this.location.prepareExternalUrl(path || '/'));
  }

  private withTrailingSlash(url: string): string {
    return url.endsWith('/') ? url : url + '/';
  }

  private redirectTo(url: string): void {
    window.location.href = url;
  }

}
