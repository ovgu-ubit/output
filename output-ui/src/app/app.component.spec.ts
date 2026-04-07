import { HttpErrorResponse } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { ConfigService } from './administration/services/config.service';
import { BackendAvailabilityService } from './core/errors/backend-availability.service';
import { ErrorPresentationService } from './core/errors/error-presentation.service';
import { AppComponent } from './app.component';
import { AuthorizationService } from './security/authorization.service';
import { RuntimeConfigService } from './services/runtime-config.service';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
  let configService: jasmine.SpyObj<ConfigService>;
  let tokenService: jasmine.SpyObj<AuthorizationService>;
  let runtimeConfigService: jasmine.SpyObj<RuntimeConfigService>;
  let errorPresentation: jasmine.SpyObj<ErrorPresentationService>;
  let backendAvailability: BackendAvailabilityService;

  beforeEach(async () => {
    configService = jasmine.createSpyObj<ConfigService>('ConfigService', ['get', 'health']);
    tokenService = jasmine.createSpyObj<AuthorizationService>('AuthorizationService', ['getUser', 'hasRole', 'login', 'logout', 'details']);
    runtimeConfigService = jasmine.createSpyObj<RuntimeConfigService>('RuntimeConfigService', ['applyThemeFromConfig', 'getValue']);
    errorPresentation = jasmine.createSpyObj<ErrorPresentationService>('ErrorPresentationService', ['present']);
    backendAvailability = new BackendAvailabilityService();

    tokenService.getUser.and.returnValue(null);
    tokenService.hasRole.and.returnValue(false);
    runtimeConfigService.getValue.and.callFake(<T>(key: string): T => {
      if (key === 'security') return false as T;
      if (key === 'theme') return 'ovgu' as T;
      return null as T;
    });
    configService.get.and.returnValue(of({ key: 'institution_short_label', value: 'TEST' } as any));
    configService.health.and.returnValue(of({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: 1,
      checks: { database: 'up' }
    }));

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [AppComponent],
      providers: [
        { provide: AuthorizationService, useValue: tokenService },
        { provide: ConfigService, useValue: configService },
        { provide: RuntimeConfigService, useValue: runtimeConfigService },
        { provide: ErrorPresentationService, useValue: errorPresentation },
        { provide: BackendAvailabilityService, useValue: backendAvailability },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(AppComponent, {
        set: { template: '' }
      })
      .compileComponents();
  });

  afterEach(() => {
    if (fixture) {
      fixture.destroy();
    }
  });

  it('should create the app', () => {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('sets the application title from config on init', fakeAsync(() => {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
    tick();

    expect(component.title).toBe('Output.TEST');
    discardPeriodicTasks();
  }));

  it('presents a backend heartbeat error when the health check fails', fakeAsync(() => {
    configService.health.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
    tick();

    expect(errorPresentation.present).toHaveBeenCalledWith(jasmine.any(HttpErrorResponse), {
      fallbackMessage: 'Backend nicht erreichbar oder nicht betriebsbereit.',
      bypassBackendUnavailableSuppression: true,
    });
    discardPeriodicTasks();
  }));
});
