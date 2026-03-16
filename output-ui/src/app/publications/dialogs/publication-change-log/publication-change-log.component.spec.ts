import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { PublicationChangeLogComponent } from './publication-change-log.component';

describe('PublicationChangeLogComponent', () => {
  let component: PublicationChangeLogComponent;
  let fixture: ComponentFixture<PublicationChangeLogComponent>;
  let publicationService: jasmine.SpyObj<PublicationService>;

  beforeEach(async () => {
    publicationService = jasmine.createSpyObj<PublicationService>('PublicationService', ['getChanges']);
    publicationService.getChanges.and.returnValue(of([{
      patch_data: {
        before: { title: 'Alt' },
        after: { title: 'Neu' }
      }
    } as any]));

    await TestBed.configureTestingModule({
      imports: [PublicationChangeLogComponent],
      providers: [
        { provide: PublicationService, useValue: publicationService }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(PublicationChangeLogComponent);
    component = fixture.componentInstance;
  });

  it('loads publication changes when a publication id is provided', () => {
    component.publicationId = 42;

    component.ngOnChanges({
      publicationId: {
        currentValue: 42,
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true
      }
    });

    expect(publicationService.getChanges).toHaveBeenCalledWith(42);
    expect(component.changeEntries.length).toBe(1);
    expect(component.changeEntries[0].rows[0].label).toBe('Titel');
  });

  it('uses provided changes without triggering a reload', () => {
    component.changes = [{
      patch_data: {
        before: { doi: '10.old/example' },
        after: { doi: '10.new/example' }
      }
    } as any];

    component.ngOnChanges({
      changes: {
        currentValue: component.changes,
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true
      }
    });

    expect(publicationService.getChanges).not.toHaveBeenCalled();
    expect(component.changeEntries.length).toBe(1);
    expect(component.changeEntries[0].rows[0].label).toBe('DOI');
  });

  it('formats the workflow report label with workflow name and version', () => {
    const label = component.getWorkflowReportLabel({
      workflowReportId: 15,
      workflowReport: {
        id: 15,
        workflow: {
          label: 'Crossref Import',
          version: 3
        }
      }
    } as any);

    expect(label).toBe('Workflow-Log #15 · Crossref Import v3');
  });
});
