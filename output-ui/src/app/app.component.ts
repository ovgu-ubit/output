import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { AuthorizationService } from './security/authorization.service';
import { ConfigService } from './administration/services/config.service';
import { RuntimeConfigService } from './services/runtime-config.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    standalone: false
})
export class AppComponent implements OnInit, OnDestroy {
  public title: string = 'Output';
  public version = '2.0.1';
  public user: string | null;
  public institution: string = '';
  public isLoading: boolean = true;
  public security: boolean;

  constructor(public tokenService: AuthorizationService,
    private router: Router, private configService:ConfigService, private runtimeConfigService:RuntimeConfigService) { 
      this.runtimeConfigService.applyThemeFromConfig();
    }

  private destroy$ = new Subject();

  ngOnInit(): void {
    this.user = this.tokenService.getUser();
    this.security = this.runtimeConfigService.getValue<boolean>("security");
    this.configService.get("institution_short_label").subscribe({
      next: data => {
        this.title = 'Output.' + data.value
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
