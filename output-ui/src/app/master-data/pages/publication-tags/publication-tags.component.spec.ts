import { PublicationTagFormComponent } from '../../../form/publication-tag-form/publication-tag-form.component';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { PublicationTagsComponent } from './publication-tags.component';
import { PublicationTagService } from '../../../services/entities/publication-tag.service';
import { ConfigService } from '../../../administration/services/config.service';
import { AuthorizationService } from '../../../security/authorization.service';
import { ErrorPresentationService } from '../../../core/errors/error-presentation.service';

describe('Publication tag catalogue', () => {
  const tag = { id: 1, label: 'Review', description: '', color: '', usage_count: 3 };
  const service = { indexPage: vi.fn(() => of({ items: [tag], total: 1, page: 0, page_size: 10 })),
    add: vi.fn(() => of(tag)), update: vi.fn(() => of(tag)), delete: vi.fn(() => of([])), getAll: () => of([tag]) };
  const dialog = { open: vi.fn((_component: unknown, _options: any) => ({ afterClosed: () => of(true) })) };
  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({ imports: [PublicationTagsComponent, NoopAnimationsModule],
      providers: [provideRouter([]), provideStore({}),
        { provide: PublicationTagService, useValue: service }, { provide: MatDialog, useValue: dialog },
        { provide: ConfigService, useValue: { get: () => of({ value: 2026 }) } },
        { provide: AuthorizationService, useValue: { hasRole: () => true } },
        { provide: ErrorPresentationService, useValue: { present: vi.fn() } },
      ] }).overrideProvider(MatDialog, { useValue: dialog }).compileComponents();
  });
  it('opens the standard entity dialog for adding tags and refreshes persisted results', async () => {
    dialog.open.mockReturnValueOnce({ afterClosed: () => of({ persisted: true, mode: 'create', entity: tag }) } as any);
    const fixture = TestBed.createComponent(PublicationTagsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.table.add();
    expect(dialog.open).toHaveBeenCalledWith(PublicationTagFormComponent, expect.objectContaining({ data: { entity: {}, persistOnSave: true } }));
    expect(service.add).not.toHaveBeenCalled();
    expect(service.indexPage.mock.calls.length).toBeGreaterThan(1);
  });
  it('opens existing tags in the same entity dialog', async () => {
    dialog.open.mockReturnValueOnce({ afterClosed: () => of({ persisted: true, mode: 'update', entity: tag }) } as any);
    const fixture = TestBed.createComponent(PublicationTagsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.table.edit(tag);
    expect(dialog.open).toHaveBeenCalledWith(PublicationTagFormComponent, expect.objectContaining({ data: { entity: tag, persistOnSave: true } }));
    expect(service.update).not.toHaveBeenCalled();
  });
  it('shows affected assignments before deleting and clears the selection', async () => {
    const fixture = TestBed.createComponent(PublicationTagsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.table.selection.select(tag);
    fixture.componentInstance.remove();
    expect(dialog.open.mock.calls[0][1].data.message).toContain('3 Zuordnung(en)');
    expect(service.delete).toHaveBeenCalledWith([1]);
    expect(fixture.componentInstance.table.selection.selected).toEqual([]);
  });
});
