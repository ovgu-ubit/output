import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { RuntimeConfigService } from '../services/runtime-config.service';
import { AuthorizationService } from './authorization.service';

@Injectable({
    providedIn: 'root'
})
export class LoginGuard  {
    constructor(public tokenService: AuthorizationService, private runtimeConfigService:RuntimeConfigService) { }

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        return this.check(route.data.roles, state);
    }

    check(roles: string[], state) {
        if (!this.runtimeConfigService.getValue('security')) return true;
        if (!roles) return true;
        if (this.tokenService.isValid()) {
            //activate route only if permissions exist for user
            if (roles.length === 0) return true;
            else return roles.some(item => this.tokenService.hasRole(item));
        }
        // if user is not logged in, redirect to login and back to the called route
        else {
            this.tokenService.login(state);
            return false;
        }
    }
}