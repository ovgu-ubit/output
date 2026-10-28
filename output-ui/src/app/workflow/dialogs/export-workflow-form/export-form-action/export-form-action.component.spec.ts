import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { BehaviorSubject, EMPTY, of, Subject } from 'rxjs';
import { ExportWorkflow } from '@output/interfaces';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { ExportWorkflowService } from 'src/app/workflow/export-workflow.service';
import { ExportFormFacade } from '../export-form-facade.service';
import { ExportFormActionComponent } from './export-form-action.component';

describe('Export workflow source actions', () => {
  let component: ExportFormActionComponent;
  let fixture: ComponentFixture<ExportFormActionComponent>;
  let workflow: BehaviorSubject<ExportWorkflow>;
  let destroy: Subject<void>;
  let service: jasmine.SpyObj<ExportWorkflowService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    workflow = new BehaviorSubject<ExportWorkflow>({ id: 7, label: 'People', source_entity: 'author', mapping: '{ "name": first_name }' });
    destroy = new Subject();
    service = jasmine.createSpyObj('ExportWorkflowService', ['run', 'getStatus', 'isRunning', 'add']);
    service.isRunning.and.resolveTo(false);
    service.getStatus.and.returnValue(of({ progress: 0, status: 'initialized' }));
    service.run.and.returnValue(EMPTY);
    service.add.and.returnValue(of({ id: 8 }));
    router = jasmine.createSpyObj('Router', ['navigateByUrl']);
    await TestBed.configureTestingModule({
      imports: [ExportFormActionComponent, NoopAnimationsModule],
      providers: [
        { provide: ExportFormFacade, useValue: { export$: workflow, destroy$: destroy } },
        { provide: ExportWorkflowService, useValue: service },
        { provide: MatSnackBar, useValue: jasmine.createSpyObj('snackbar', ['open']) },
        { provide: MatDialog, useValue: {} },
        { provide: Router, useValue: router },
        { provide: Store, useValue: { select: () => of({ filter: { filter: { expressions: [] }, paths: ['recent'] } }) } },
        { provide: ErrorPresentationService, useValue: jasmine.createSpyObj('errors', ['present']) },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ExportFormActionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => { destroy.next(); destroy.complete(); });

  it('hides publication filters for other classes and omits stale filters from execution', () => {
    expect(component.hasPublicationFilter).toBeTrue();
    expect(fixture.nativeElement.querySelector('.publication-filter')).toBeNull();
    component.run();
    expect(service.run).toHaveBeenCalledOnceWith(7, undefined, false);
  });

  it('retains publication filtering for old workflows without a source', async () => {
    workflow.next({ id: 7, mapping: '$' });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.publication-filter')).not.toBeNull();
    component.run();
    expect(service.run).toHaveBeenCalledOnceWith(7, { filter: { expressions: [] }, paths: ['recent'] }, false);
  });

  it('retains the source and mapping when duplicating a version', () => {
    component.duplicate();
    expect(service.add).toHaveBeenCalledWith(jasmine.objectContaining({
      id: undefined, source_entity: 'author', mapping: '{ "name": first_name }', published_at: null,
    }));
    expect(router.navigateByUrl).toHaveBeenCalledWith('/workflow/publication_export/8/overview');
  });
});
