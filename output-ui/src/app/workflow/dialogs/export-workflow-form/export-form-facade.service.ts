import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, of, Subject, tap } from "rxjs";
import { ExportWorkflow, WorkflowReport } from "../../../../../../output-interfaces/Workflow";
import { ExportWorkflowService } from "../../export-workflow.service";

@Injectable()
export class ExportFormFacade {
  private readonly exportSubject = new BehaviorSubject<ExportWorkflow | null>(null);
  private persistedSnapshot: string | null = null;
  readonly export$ = this.exportSubject.asObservable();
  readonly destroy$ = new Subject<void>();

  constructor(private api: ExportWorkflowService) { }

  load(id: number) {
    return this.api.getOne(id).pipe(
      tap(wf => {
        this.exportSubject.next(wf);
        this.persistedSnapshot = this.snapshot(wf);
      })
    );
  }

  createNew() {
    const wf: ExportWorkflow = {
      created_at: null,
      modified_at: null,
      deleted_at: null,
      published_at: null
    };
    this.exportSubject.next(wf);
    this.persistedSnapshot = this.snapshot(wf);
    return wf;
  }

  getReports(workflowId: number): Observable<WorkflowReport[]> {
    return this.api.getWorkflowReports(workflowId);
  }

  destroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  requestReport(reportId: number) {
    return this.api.getWorkflowReport(reportId);
  }

  deleteReport(reportId: number) {
    return this.api.deleteWorkflowReport(reportId);
  }

  patch(p: Partial<ExportWorkflow>) {
    const cur = this.exportSubject.value;
    if (!cur) return;
    this.exportSubject.next({ ...cur, ...p });
  }

  hasUnsavedChanges(): boolean {
    return this.snapshot(this.exportSubject.value) !== this.persistedSnapshot;
  }

  save() {
    const cur = this.exportSubject.value;
    if (!cur) return of(null);
    if (cur.id) return this.api.update(cur).pipe(
      tap(updated => {
        this.exportSubject.next(updated);
        this.persistedSnapshot = this.snapshot(updated);
      })
    );
    return this.api.add(cur).pipe(
      tap(updated => {
        this.exportSubject.next(updated);
        this.persistedSnapshot = this.snapshot(updated);
      })
    );
  }

  private snapshot(value: ExportWorkflow | null): string | null {
    return value ? JSON.stringify(value) : null;
  }
}
