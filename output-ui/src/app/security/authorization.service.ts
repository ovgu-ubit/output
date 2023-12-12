import { Injectable } from "@angular/core";

@Injectable({
  providedIn: 'root'
})
export abstract class AuthorizationService {

  isValid(): boolean {
    return true;
  }

  getUser(): string | null {
    return null;
  }

  getPermissions(): { rolename: string, appname: string | null }[] | null {
    return null;
  }

  hasRole(rolename: string): boolean {
    return true;
  }

  login(state): void {

  }

  logout(): void {

  }

  details(): void {
    
  }
}