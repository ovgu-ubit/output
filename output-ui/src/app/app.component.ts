import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, exhaustMap, of, Subject, takeUntil, timer } from 'rxjs';
import { BackendAvailabilityService } from './core/errors/backend-availability.service';
import { ErrorPresentationService } from './core/errors/error-presentation.service';
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
  public version = 'dev';
  public user: string | null;
  public institution: string = '';
  public isLoading: boolean = true;
  public security: boolean;
  private readonly heartbeatIntervalMs = 60000;

  constructor(public tokenService: AuthorizationService,
    private router: Router,
    private configService: ConfigService,
    private runtimeConfigService: RuntimeConfigService,
    private errorPresentation: ErrorPresentationService,
    private backendAvailability: BackendAvailabilityService) {
      this.runtimeConfigService.applyThemeFromConfig();
    }

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.user = this.tokenService.getUser();
    this.security = this.runtimeConfigService.getValue<boolean>("security");
    this.configService.get("institution_short_label").pipe(
      takeUntil(this.destroy$),
      catchError(() => of(null))
    ).subscribe({
      next: data => {
        if (!data?.value) return;
        this.title = 'Output.' + data.value
      }
    });
    this.startBackendHeartbeat();

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

  private startBackendHeartbeat(): void {
    timer(0, this.heartbeatIntervalMs).pipe(
      takeUntil(this.destroy$),
      exhaustMap(() => this.configService.health().pipe(
        catchError((error) => {
          this.handleHeartbeatFailure(error);
          return of(null);
        })
      ))
    ).subscribe((health) => {
      if (!health) return;

      if (health.status !== 'ok' || health.checks?.database !== 'up') {
        this.handleHeartbeatFailure(new Error('Backend health check failed.'));
        return;
      }

      this.backendAvailability.markAvailable();
    });
  }

  private handleHeartbeatFailure(error: unknown): void {
    const shouldNotify = this.backendAvailability.markUnavailable();
    if (!shouldNotify) return;
    this.errorPresentation.present(error, {
      fallbackMessage: 'Backend nicht erreichbar oder nicht betriebsbereit.',
      bypassBackendUnavailableSuppression: true,
    });
  }
}
