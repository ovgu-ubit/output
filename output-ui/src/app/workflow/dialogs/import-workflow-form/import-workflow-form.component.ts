import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { concat, concatMap, concatWith, filter, map, Observable, shareReplay, startWith, switchMap, take, takeUntil, tap } from 'rxjs';
import { SharedModule } from 'src/app/shared/shared.module';
import { ImportWorkflow } from '../../../../../../output-interfaces/Workflow';
import { WorkflowService } from '../../workflow.service';
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
  ], providers: [
    ImportFormFacade
  ]
})
export class ImportWorkflowFormComponent implements OnInit, AfterViewInit, OnDestroy {

  constructor(protected facade: ImportFormFacade, private route: ActivatedRoute,
    private workflowService: WorkflowService, private router: Router) { }

  id: number;
  entity: ImportWorkflow;
  opened = true;

  ngOnInit(): void {
    this.route.paramMap.pipe(
      map(pm => {
        this.id = Number(pm.get('id'))
        return this.id
      }),
      filter(id => !Number.isNaN(id))
      , concatMap(
        id => this.facade.load(id)
      ), tap(wf => { this.entity = wf; }),
      takeUntil(this.facade.destroy$)
    ).subscribe();
  }

  ngAfterViewInit(): void {

  }

  ngOnDestroy(): void {
    this.facade.destroy();
  }

  abort() {
    if (!this.entity?.published_at && !this.entity?.deleted_at) {
      this.workflowService.update({ id: this.entity.id, locked_at: null }).subscribe({
        next: data => {
          this.router.navigateByUrl('/workflow/publication_import')
        }
      })
    } else this.router.navigateByUrl('/workflow/publication_import')
  }

  export() {
    this.workflowService.export(this.id).subscribe({
      next: (resp) => {
        const blob = resp.body!;
        const cd = resp.headers.get('content-disposition') || resp.headers.get('Content-Disposition');

        const filename = this.getFilenameFromContentDisposition(cd)
          ?? `import-workflow-${this.id}.json`;

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

    // RFC 5987: filename*=UTF-8''...
    const mStar = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
    if (mStar?.[1]) return decodeURIComponent(mStar[1].trim().replace(/(^"|"$)/g, ''));

    // simple: filename="..."
    const m = cd.match(/filename\s*=\s*("?)([^";]+)\1/i);
    return m?.[2]?.trim() ?? null;
  }

  toggle() {
    this.opened = !this.opened;
  }

  getLink() {
    return "/workflow/publication_import/" + (this.id ?? "neu");
  }
}
