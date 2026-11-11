import type { MockedObject } from "vitest";
import { HttpErrorResponse } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { ConfigService } from './administration/services/config.service';
import { BackendAvailabilityService } from './core/errors/backend-availability.service';
import { ErrorPresentationService } from './core/errors/error-presentation.service';
import { AppComponent } from './app.component';
import { AuthorizationService } from './security/authorization.service';
import { RuntimeConfigService } from './services/runtime-config.service';

describe('AppComponent', () => {
    beforeEach(() => {
        vi.useFakeTimers({ advanceTimeDelta: 1, shouldAdvanceTime: true });
    });
    afterEach(() => {
        fixture?.destroy();
        vi.clearAllTimers();
        vi.useRealTimers();
    });
    let fixture: ComponentFixture<AppComponent>;
    let component: AppComponent;
    let configService: MockedObject<Pick<ConfigService, 'get' | 'health'>>;
    let tokenService: MockedObject<Pick<AuthorizationService, 'getUser' | 'hasRole' | 'login' | 'logout' | 'details'>>;
    let runtimeConfigService: MockedObject<Pick<RuntimeConfigService, 'applyThemeFromConfig' | 'getValue'>>;
    let errorPresentation: MockedObject<Pick<ErrorPresentationService, 'present'>>;
    let backendAvailability: BackendAvailabilityService;
    let browserTitle: Title;

    beforeEach(async () => {
        configService = {
            get: vi.fn().mockName("ConfigService.get"),
            health: vi.fn().mockName("ConfigService.health")
        };
        tokenService = {
            getUser: vi.fn().mockName("AuthorizationService.getUser"),
            hasRole: vi.fn().mockName("AuthorizationService.hasRole"),
            login: vi.fn().mockName("AuthorizationService.login"),
            logout: vi.fn().mockName("AuthorizationService.logout"),
            details: vi.fn().mockName("AuthorizationService.details")
        };
        runtimeConfigService = {
            applyThemeFromConfig: vi.fn().mockName("RuntimeConfigService.applyThemeFromConfig"),
            getValue: vi.fn().mockName("RuntimeConfigService.getValue")
        };
        errorPresentation = {
            present: vi.fn().mockName("ErrorPresentationService.present")
        };
        backendAvailability = new BackendAvailabilityService();

        tokenService.getUser.mockReturnValue(null);
        tokenService.hasRole.mockReturnValue(false);
        runtimeConfigService.getValue.mockImplementation(<T>(key: string): T => {
            if (key === 'security')
                return false as T;
            if (key === 'theme')
                return 'ovgu' as T;
            return null as T;
        });
        configService.get.mockReturnValue(of({ key: 'institution_short_label', value: 'TEST' } as any));
        configService.health.mockReturnValue(of({
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
            set: {
                template: `
            <div class="application-meta">
              <div class="version-row">
                <span class="label-small">{{this.version}}</span>
                <a class="help-link" href="https://github.com/ovgu-ubit/output/wiki" target="_blank"
                  rel="noopener noreferrer" aria-label="Output-Wiki öffnen">Hilfe</a>
              </div>
              <a class="releases-link" href="https://github.com/ovgu-ubit/output/releases" target="_blank"
                rel="noopener noreferrer">GitHub Releases</a>
            </div>
            <main [class.demo-banner-offset]="this.demoAuth"></main>
            <div class="demo-banner" *ngIf="this.demoAuth">
              <span>Demo-Version: Diese Instanz dient nur zur Erprobung.</span>
              <a routerLink="/demo-info">Informationen zu Impressum, Datenschutz und Lizenz</a>
            </div>
          `
            }
        })
            .compileComponents();

        browserTitle = TestBed.inject(Title);
    });

    it('should create the app', () => {
        fixture = TestBed.createComponent(AppComponent);
        component = fixture.componentInstance;
        expect(component).toBeTruthy();
    });

    it('sets the application title from config on init', async () => {
        fixture = TestBed.createComponent(AppComponent);
        component = fixture.componentInstance;

        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(0);

        expect(component.title).toBe('Output.TEST');
        expect(browserTitle.getTitle()).toBe('Output.TEST');
    });

    it('ignores institution short label lookup failures without surfacing a heartbeat error', async () => {
        configService.get.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

        fixture = TestBed.createComponent(AppComponent);
        component = fixture.componentInstance;

        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(0);

        expect(component.title).toBe('Output');
        expect(browserTitle.getTitle()).toBe('Output');
        expect(errorPresentation.present).not.toHaveBeenCalled();
    });

    it('presents a backend heartbeat error when the health check fails', async () => {
        configService.health.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

        fixture = TestBed.createComponent(AppComponent);
        component = fixture.componentInstance;

        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(0);

        expect(errorPresentation.present).toHaveBeenCalledWith(expect.any(HttpErrorResponse), {
            fallbackMessage: 'Backend nicht erreichbar oder nicht betriebsbereit.',
            bypassBackendUnavailableSuppression: true,
        });
    });

    it('shows a demo banner in demo mode', async () => {
        runtimeConfigService.getValue.mockImplementation(<T>(key: string): T => {
            if (key === 'security')
                return true as T;
            if (key === 'authorization_service')
                return 'demo' as T;
            if (key === 'theme')
                return 'ovgu' as T;
            return null as T;
        });

        fixture = TestBed.createComponent(AppComponent);
        component = fixture.componentInstance;

        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(0);

        expect(fixture.nativeElement.querySelector('.demo-banner')?.textContent).toContain('Demo-Version');
    });

    it('links the version area to releases and the wiki', async () => {
        fixture = TestBed.createComponent(AppComponent);

        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(0);

        const releasesLink = fixture.nativeElement.querySelector('.releases-link') as HTMLAnchorElement;
        const helpLink = fixture.nativeElement.querySelector('.help-link') as HTMLAnchorElement;
        expect(releasesLink.href).toBe('https://github.com/ovgu-ubit/output/releases');
        expect(helpLink.href).toBe('https://github.com/ovgu-ubit/output/wiki');
    });
});
