import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { StatusService } from 'src/app/services/entities/status.service';
import { ConfigService } from 'src/app/administration/services/config.service';
import { EnrichService } from 'src/app/administration/services/enrich.service';
import { RuntimeConfigService } from 'src/app/services/runtime-config.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SharedModule } from 'src/app/shared/shared.module';
import { TableModule } from 'src/app/table/table.module';

import { PublicationsComponent } from './publications.component';

describe('PublicationsComponent', () => {
  let component: PublicationsComponent;
  let fixture: ComponentFixture<PublicationsComponent>;

  const mockPublicationService = {
    getFilters: jasmine.createSpy('getFilters').and.returnValue(of([])),
    updateAll: jasmine.createSpy('updateAll').and.returnValue(of(0))
  };

  const mockStatusService = {
    getAll: jasmine.createSpy('getAll').and.returnValue(of([]))
  };

  const mockConfigService = {
    get: jasmine.createSpy('get').and.returnValue(of({ value: {} }))
  };

  const mockEnrichService = {
    getEnrichs: jasmine.createSpy('getEnrichs').and.returnValue(of([])),
    startID: jasmine.createSpy('startID').and.returnValue(of({}))
  };

  const mockRuntimeConfigService = {
    getValue: jasmine.createSpy('getValue').and.returnValue('http://localhost/')
  };

  const mockAuthService = {
    hasRole: jasmine.createSpy('hasRole').and.returnValue(true)
  };

  beforeEach(fakeAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        MatSnackBarModule,
        MatTooltipModule,
        SharedModule,
        TableModule
      ],
      declarations: [ PublicationsComponent ],
      providers: [
        provideMockStore({}),
        { provide: PublicationService, useValue: mockPublicationService },
        { provide: StatusService, useValue: mockStatusService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EnrichService, useValue: mockEnrichService },
        { provide: RuntimeConfigService, useValue: mockRuntimeConfigService },
        { provide: AuthorizationService, useValue: mockAuthService },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PublicationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
