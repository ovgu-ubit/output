import { Injectable } from "@angular/core";

@Injectable({
  providedIn: 'root'
})
export abstract class AuthorizationService {

  /**
   * 
   * @returns true if the request comes from an authenticated user
   */
  isValid(): boolean {
    return true;
  }

  /**
   * 
   * @returns the username of the authenticated user or null
   */
  getUser(): string | null {
    return null;
  }

  /**
   * 
   * @returns the permission array of the authenticated user in the form {rolename, appname}
   */
  getPermissions(): { rolename: string, appname: string | null }[] | null {
    return null;
  }

  /**
   * 
   * @param rolename the required rolename for a function
   * @returns true if the authenticated user has the required role
   */
  hasRole(rolename: string): boolean {
    return true;
  }

  /**
   * handles the login if a user is not authenticated
   * @param state 
   */
  login(state): void {

  }

  /**
   * handles what happens if the user clicks on Logout
   */
  logout(): void {

  }

  /**
   * handles what happens if the user clicks on account details
   */
  details(): void {
    
  }
}