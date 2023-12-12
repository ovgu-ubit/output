import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { environment } from '../../environments/environment';
import { AuthorizationService } from './authorization.service';
import { Router } from '@angular/router';
const COOKIE_DETAILS = 'auth-details';

@Injectable({
  providedIn: 'root'
})
export class CookieTokenService extends AuthorizationService {
  constructor(private cookieService: CookieService, private router:Router) { super(); }

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
    if (!environment.security) return true;
    else return this.getUser() && this.getPermissions()?.some((v, i, a) => (v['appname'] === 'output' && v['rolename'] === rolename) || (v['appname'] === null && v['rolename'] === 'admin'));
  }

  public override login(state) {
    window.location.href = environment.auth_ui + '/login?redirectURL=' + environment.self + state?.url;
  }

  public override logout() {
    window.location.href = environment.auth_api + 'auth/logout';
  }

  public override details() {
    window.location.href = environment.auth_ui + '/profile?redirectURL=' + environment.self + this.router.url;
  }

}