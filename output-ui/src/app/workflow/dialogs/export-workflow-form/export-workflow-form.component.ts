import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EMPTY, filter, map, of, switchMap, takeUntil } from 'rxjs';
import { SharedModule } from 'src/app/shared/shared.module';
import { ExportWorkflow } from '../../../../../../output-interfaces/Workflow';
import { ExportWorkflowService } from '../../export-workflow.service';
import { ExportFormFacade } from './export-form-facade.service';

@Component({
  selector: 'app-export-workflow-form',
  templateUrl: './export-workflow-form.component.html',
  styleUrl: './export-workflow-form.component.css',
  standalone: true,
  imports: [
    SharedModule,
    RouterModule,
    MatSidenavModule,
    MatListModule,
    MatToolbarModule
  ],
  providers: [
    ExportFormFacade
  ]
})
export class ExportWorkflowFormComponent implements OnInit, AfterViewInit, OnDestroy {
  constructor(
    protected facade: ExportFormFacade,
    private route: ActivatedRoute,
    private exportWorkflowService: ExportWorkflowService,
    private router: Router,
    private snackBar: MatSnackBar
  ) { }

  id: any;
  entity: ExportWorkflow;
  opened = true;
  release = false;

  ngOnInit(): void {
    this.facade.export$.pipe(
      filter((wf): wf is ExportWorkflow => wf != null),
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
    ).subscribe();
  }

  ngAfterViewInit(): void {
  }

  ngOnDestroy(): void {
    if (this.entity?.id && !this.release && !this.entity?.published_at && !this.entity?.deleted_at) {
      this.release = true;
      this.exportWorkflowService.update({ id: this.entity.id, locked_at: null }).subscribe();
    }
    this.facade.destroy();
  }

  save() {
    this.facade.save().subscribe({
      next: data => {
        this.snackBar.open(
          'Workflow erfolgreich gespeichert unter ID ' + data.id + '.',
          'Sehr schoen.',
          { duration: 4500, verticalPosition: 'top', panelClass: ['success-snackbar'] },
        );
        this.router.navigateByUrl('/workflow/publication_export/' + data.id + '/overview');
      }
    });
  }

  abort() {
    if (!this.release && !this.entity?.published_at && !this.entity?.deleted_at) {
      this.release = true;
      this.exportWorkflowService.update({ id: this.entity.id, locked_at: null }).subscribe({
        next: () => {
          this.router.navigateByUrl('/workflow/publication_export');
        }
      });
    } else {
      this.router.navigateByUrl('/workflow/publication_export');
    }
  }

  export() {
    this.exportWorkflowService.export(this.id).subscribe({
      next: (resp) => {
        const blob = resp.body!;
        const cd = resp.headers.get('content-disposition') || resp.headers.get('Content-Disposition');
        const filename = this.getFilenameFromContentDisposition(cd) ?? `export-workflow-${this.id}.json`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
      }
    });
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
    return '/workflow/publication_export/' + (this.id ?? 'neu');
  }

  getLabel(): string {
    if (this.entity?.id) return '/Workflows/Publikationsexport/' + this.entity.label + ' (' + this.entity.version + ')';
    return '/Workflows/Publikationsexport/Neuer Export';
  }
}
