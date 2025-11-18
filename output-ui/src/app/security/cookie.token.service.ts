import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { AuthorizationService } from './authorization.service';
import { Router } from '@angular/router';
import { RuntimeConfigService } from '../services/runtime-config.service';
const COOKIE_DETAILS = 'auth-details';

@Injectable({
  providedIn: 'root'
})
export class CookieTokenService extends AuthorizationService {
  constructor(private cookieService: CookieService, private router:Router, private runtimeConfigService:RuntimeConfigService) { super(); }

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
    window.location.href = this.runtimeConfigService.getValue('auth_ui') + '/login?redirectURL=' + this.runtimeConfigService.getValue('self') + state?.url;
  }

  public override logout() {
    window.location.href = this.runtimeConfigService.getValue('auth_api') + 'auth/logout';
  }

  public override details() {
    window.location.href = this.runtimeConfigService.getValue('auth_ui') + '/profile?redirectURL=' + this.runtimeConfigService.getValue('self') + this.router.url;
  }

}