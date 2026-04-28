import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ConfigService } from 'src/app/administration/services/config.service';
import { EnrichService } from 'src/app/administration/services/enrich.service';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { ContractService } from 'src/app/services/entities/contract.service';
import { FunderService } from 'src/app/services/entities/funder.service';
import { GreaterEntityService } from 'src/app/services/entities/greater-entity.service';
import { LanguageService } from 'src/app/services/entities/language.service';
import { OACategoryService } from 'src/app/services/entities/oa-category.service';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { PublicationTypeService } from 'src/app/services/entities/publication-type.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { StatusService } from 'src/app/services/entities/status.service';
import { SharedModule } from 'src/app/shared/shared.module';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { PublicationFormComponent, PubValidator } from './publication-form.component';
import { PublicationChangeLogComponent } from '../publication-change-log/publication-change-log.component';

describe('PublicationFormComponent', () => {
  let component: PublicationFormComponent;
  let fixture: ComponentFixture<PublicationFormComponent>;

  const mockDialogRef = {
    close: jasmine.createSpy('close'),
    addPanelClass: jasmine.createSpy('addPanelClass'),
    removePanelClass: jasmine.createSpy('removePanelClass'),
    updateSize: jasmine.createSpy('updateSize'),
    updatePosition: jasmine.createSpy('updatePosition')
  };

  const mockAuthService = {
    hasRole: jasmine.createSpy('hasRole').and.returnValue(true)
  };

  const mockConfigService = {
    get: jasmine.createSpy('get').and.returnValue(of({ value: {} }))
  };

  const mockStatusService = {
    getAll: jasmine.createSpy('getAll').and.returnValue(of([]))
  };

  const mockPubService = {
    getOne: jasmine.createSpy('getOne').and.returnValue(of({
      id: 1,
      title: 'Test Pub',
      authorPublications: [],
      identifiers: []
    })),
    update: jasmine.createSpy('update').and.returnValue(of({})),
    add: jasmine.createSpy('add').and.returnValue(of({})),
    getChanges: jasmine.createSpy('getChanges').and.returnValue(of([]))
  };

  beforeEach(fakeAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatSnackBarModule,
        MatTooltipModule,
        SharedModule,
        PublicationChangeLogComponent
      ],
      declarations: [ PublicationFormComponent ],
      providers: [
        FormBuilder,
        PubValidator,
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { entity: { id: 1 } } },
        { provide: AuthorizationService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: StatusService, useValue: mockStatusService },
        { provide: PublicationService, useValue: mockPubService },
        { provide: PublicationTypeService, useValue: { getAll: () => of([]) } },
        { provide: OACategoryService, useValue: { getAll: () => of([]) } },
        { provide: GreaterEntityService, useValue: { getAll: () => of([]) } },
        { provide: PublisherService, useValue: { getAll: () => of([]) } },
        { provide: ContractService, useValue: { getAll: () => of([]) } },
        { provide: FunderService, useValue: { getAll: () => of([]) } },
        { provide: LanguageService, useValue: { getAll: () => of([]) } },
        { provide: EnrichService, useValue: { startID: () => of({}) } },
        { provide: ErrorPresentationService, useValue: { clearFieldErrors: () => {}, applyFieldErrors: () => {}, present: () => {} } },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideStore({})
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PublicationFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
