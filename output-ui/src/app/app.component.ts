import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthorizationService } from './security/authorization.service';
import { ConfigService } from './administration/services/config.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    standalone: false
})
export class AppComponent implements OnInit, OnDestroy {
  public title: string = 'Output2';
  public version = '2.0.0-beta';
  public user: string | null;
  public institution: string = '';
  public isLoading: boolean = true;
  public security: boolean;

  constructor(public tokenService: AuthorizationService,
    private router: Router, private configService:ConfigService) { }

  private destroy$ = new Subject();

  ngOnInit(): void {
    this.user = this.tokenService.getUser();
    this.security = environment.security;
    this.configService.get("institution_short_label").subscribe({
      next: data => {
        this.title = 'Output2.' + data.value
      }
    })

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
