import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthorizationService } from './security/authorization.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  public title: string = 'Output2';
  public version = '0.2.5-beta';
  public user: string | null;
  public institution: string = '';
  public isLoading: boolean = true;
  public security: boolean;

  constructor(public tokenService: AuthorizationService,
    private router: Router) { }

  private destroy$ = new Subject();

  ngOnInit(): void {
    this.user = this.tokenService.getUser();
    this.security = environment.security;

    this.title += '.' + environment.institution;
  }

  ngOnDestroy(): void {
    this.destroy$.next('');
  }

  async login() {
    this.tokenService.login(this.router.routerState.snapshot);
  }

  logout() {
    this.tokenService.logout();
  }

  details() {
    this.tokenService.details();
  }
}
