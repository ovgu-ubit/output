import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, of, Subject, tap } from "rxjs";
import { ImportWorkflow, WorkflowReport } from "../../../../../../output-interfaces/Workflow";
import { WorkflowService } from "../../workflow.service";

@Injectable()
export class ImportFormFacade {
  private readonly importSubject = new BehaviorSubject<ImportWorkflow | null>(null);
  private persistedSnapshot: string | null = null;
  readonly import$ = this.importSubject.asObservable();
  readonly destroy$ = new Subject<void>();

  constructor(private api: WorkflowService) { }

  load(id: number) {
    return this.api.getOne(id).pipe(
      tap(wf => {
        this.importSubject.next(wf);
        this.persistedSnapshot = this.snapshot(wf);
      })
    );
  }

  createNew() {
    const wf:ImportWorkflow = {
      created_at: null,
      modified_at: null,
      deleted_at: null,
      published_at: null
    }
    this.importSubject.next(wf)
    this.persistedSnapshot = this.snapshot(wf);
    return wf;
  }

  getReports(workflowId: number, options?: { limit?: number; offset?: number }): Observable<WorkflowReport[]> {
    return this.api.getWorkflowReports(workflowId, undefined, options);
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

  patch(p: Partial<ImportWorkflow>) {
    const cur = this.importSubject.value;
    if (!cur) return;
    this.importSubject.next({ ...cur, ...p });
  }

  hasUnsavedChanges(): boolean {
    return this.snapshot(this.importSubject.value) !== this.persistedSnapshot;
  }

  // optional: persist
  save() {
    const cur = this.importSubject.value;
    if (!cur) return of(null);
    if (cur.id) return this.api.update(cur).pipe(
      tap(updated => {
        this.importSubject.next(updated);
        this.persistedSnapshot = this.snapshot(updated);
      })
    );
    else return this.api.add(cur).pipe(
      tap(updated => {
        this.importSubject.next(updated);
        this.persistedSnapshot = this.snapshot(updated);
      })
    );
  }

  private snapshot(value: ImportWorkflow | null): string | null {
    return value ? JSON.stringify(value) : null;
  }
}
