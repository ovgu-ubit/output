import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterModule, RouterOutlet } from '@angular/router';
import { EMPTY, filter, firstValueFrom, map, of, switchMap, takeUntil } from 'rxjs';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/shared/confirm-dialog/confirm-dialog.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { ImportWorkflow } from '../../../../../../output-interfaces/Workflow';
import { WorkflowService } from '../../workflow.service';
import { WorkflowFormPage } from '../workflow-form-page.interface';
import { ImportFormFacade } from './import-form-facade.service';

@Component({
  selector: 'app-import-workflow-form',
  templateUrl: './import-workflow-form.component.html',
  styleUrl: './import-workflow-form.component.css',
  standalone: true,
  imports: [
    SharedModule,
    RouterModule,
    MatSidenavModule,
    MatListModule,
    MatToolbarModule
  ],
  providers: [ImportFormFacade]
})
export class ImportWorkflowFormComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild(RouterOutlet) outlet?: RouterOutlet;

  constructor(
    protected facade: ImportFormFacade,
    private route: ActivatedRoute,
    private workflowService: WorkflowService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private errorPresentation: ErrorPresentationService,
  ) { }

  id: any;
  entity: ImportWorkflow;
  opened = true;
  release = false;

  ngOnInit(): void {
    this.facade.import$.pipe(
      filter((wf): wf is ImportWorkflow => wf != null),
      takeUntil(this.facade.destroy$),
    ).subscribe((wf) => {
      this.entity = wf;
    });

    this.route.paramMap.pipe(
      map(pm => {
        this.id = pm.get('id');
        return this.id;
      }),
      switchMap(id => {
        if (id === 'new') return of(this.facade.createNew());
        if (Number.isNaN(Number(id))) return EMPTY;
        return this.facade.load(Number(id));
      }),
      takeUntil(this.facade.destroy$)
    ).subscribe({
      error: (err) => {
        this.errorPresentation.present(err, { action: 'load', entity: 'Workflow' });
        if (err?.status === 409) void this.router.navigateByUrl('/workflow/publication_import');
      }
    });
  }

  ngAfterViewInit(): void {
  }

  ngOnDestroy(): void {
    if (this.entity?.id && !this.release && !this.entity?.published_at && !this.entity?.deleted_at) {
      this.release = true;
      this.workflowService.update({ id: this.entity.id, locked_at: null }).subscribe();
    }
    this.facade.destroy();
  }

  async save() {
    const activePage = this.getActivePage();
    if (activePage?.hasPendingChanges()) {
      const persisted = await activePage.persistFormToBackend();
      if (!persisted) return;

      this.showSaveSuccess(this.entity?.id);
      if (this.entity?.id) {
        this.router.navigateByUrl('/workflow/publication_import/' + this.entity.id + '/overview');
      }
      return;
    }

    const data = await this.persistCurrentWorkflow(true);
    if (data?.id) {
      this.router.navigateByUrl('/workflow/publication_import/' + data.id + '/overview');
    }
  }

  async abort() {
    if (!(await this.confirmSaveBeforeLeave())) return;

    if (this.entity.id && !this.release && !this.entity?.published_at && !this.entity?.deleted_at) {
      this.release = true;
      this.workflowService.update({ id: this.entity.id, locked_at: null }).subscribe({
        next: () => {
          this.router.navigateByUrl('/workflow/publication_import');
        }
      });
    } else {
      this.router.navigateByUrl('/workflow/publication_import');
    }
  }

  async navigateTo(path: string, event?: MouseEvent): Promise<void> {
    event?.preventDefault();
    if (!(await this.confirmSaveBeforeLeave())) return;
    void this.router.navigate([path], { relativeTo: this.route });
  }

  export() {
    this.workflowService.export(this.id).subscribe({
      next: (resp) => {
        const blob = resp.body!;
        const cd = resp.headers.get('content-disposition') || resp.headers.get('Content-Disposition');
        const filename = this.getFilenameFromContentDisposition(cd) ?? `import-workflow-${this.id}.json`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
      }
    })
  }

  private getFilenameFromContentDisposition(cd: string | null): string | null {
    if (!cd) return null;

    const mStar = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
    if (mStar?.[1]) return decodeURIComponent(mStar[1].trim().replace(/(^"|"$)/g, ''));

    const m = cd.match(/filename\s*=\s*("?)([^";]+)\1/i);
    return m?.[2]?.trim() ?? null;
  }

  toggle() {
    this.opened = !this.opened;
  }

  getLink() {
    return '/workflow/publication_import/' + (this.id ?? 'neu');
  }

  getLabel(): string {
    if (this.entity?.id) return '/Workflows/Publikationsimport/' + this.entity.label + ' (' + this.entity.version + ')';
    return '/Workflows/Publikationsimport/Neuer Import';
  }

  private async confirmSaveBeforeLeave(): Promise<boolean> {
    const activePage = this.getActivePage();
    if (!activePage?.hasPendingChanges()) return true;

    const dialogData = new ConfirmDialogModel(
      'Ungespeicherte Änderungen',
      'Sollen die durchgeführten Änderungen zunächst gespeichert werden?'
    );
    const shouldSave = !!(await firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, { maxWidth: '500px', disableClose: true, data: dialogData }).afterClosed()
    ));

    if (shouldSave) {
      return await activePage.persistFormToBackend();
    }

    activePage.resetFormToFacade();
    return true;
  }

  private getActivePage(): WorkflowFormPage | null {
    const component = this.outlet?.component as Partial<WorkflowFormPage> | undefined;
    if (!component) return null;
    if (!component.hasPendingChanges || !component.persistFormToBackend || !component.resetFormToFacade) return null;
    return component as WorkflowFormPage;
  }

  private async persistCurrentWorkflow(showSuccess: boolean): Promise<ImportWorkflow | null> {
    try {
      const data = await firstValueFrom(this.facade.save());
      if (!data) return null;

      if (showSuccess) this.showSaveSuccess(data.id);
      return data;
    } catch (error) {
      this.showSaveError(error);
      return null;
    }
  }

  private showSaveSuccess(id?: number) {
    this.snackBar.open(
      'Workflow erfolgreich gespeichert unter ID ' + id + '.',
      'Sehr schoen.',
      { duration: 4500, verticalPosition: 'top', panelClass: ['success-snackbar'] },
    );
  }

  private showSaveError(error: unknown) {
    this.errorPresentation.present(error, { action: 'save', entity: 'Workflow' });
  }
}
