import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
    if (this.isDemoAuth()) {
      const dialogRef = this.dialog.open(DemoLoginDialogComponent, {
        width: '380px',
        disableClose: true,
        data: { redirectUrl: state?.url ?? this.router.url }
      });
      dialogRef.afterClosed().subscribe((result?: DemoLoginDialogResult) => {
        if (!result?.success) return;
        this.redirectTo(result.redirectUrl || state?.url || this.router.url || '/');
      });
      return;
    }

    this.redirectTo(this.runtimeConfigService.getValue('auth_ui') + '/login?redirectURL=' + this.runtimeConfigService.getValue('self') + state?.url);
  }

  public override logout() {
    if (this.isDemoAuth()) {
      this.http.post(this.getAuthBaseUrl() + 'auth/logout', {}, { withCredentials: true }).subscribe({
        next: () => this.redirectTo('/'),
        error: () => this.redirectTo('/'),
      });
      return;
    }

    this.redirectTo(this.runtimeConfigService.getValue('auth_api') + 'auth/logout');
  }

  public override details() {
    if (this.isDemoAuth()) return;
    this.redirectTo(this.runtimeConfigService.getValue('auth_ui') + '/profile?redirectURL=' + this.runtimeConfigService.getValue('self') + this.router.url);
  }

  private isDemoAuth(): boolean {
    return this.runtimeConfigService.getValue('authorization_service') === 'demo';
  }

  private getAuthBaseUrl(): string {
    return this.runtimeConfigService.getValue<string>('auth_api') || this.runtimeConfigService.getValue<string>('api');
  }

  private redirectTo(url: string): void {
    window.location.href = url;
  }

}
