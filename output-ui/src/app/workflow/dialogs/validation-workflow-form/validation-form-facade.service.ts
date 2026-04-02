import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, of, Subject, tap } from "rxjs";
import { ValidationWorkflow, WorkflowReport } from "../../../../../../output-interfaces/Workflow";
import { ValidationWorkflowService } from "../../validation-workflow.service";

@Injectable()
export class ValidationFormFacade {
  private readonly validationSubject = new BehaviorSubject<ValidationWorkflow | null>(null);
  private persistedSnapshot: string | null = null;
  readonly validation$ = this.validationSubject.asObservable();
  readonly destroy$ = new Subject<void>();

  constructor(private api: ValidationWorkflowService) { }

  load(id: number) {
    return this.api.getOne(id).pipe(
      tap(wf => {
        this.validationSubject.next(wf);
        this.persistedSnapshot = this.snapshot(wf);
      })
    );
  }

  createNew() {
    const wf: ValidationWorkflow = {
      created_at: null,
      modified_at: null,
      deleted_at: null,
      published_at: null,
      target: 'publication',
      target_filter: { expressions: [] },
      rules: [],
    };
    this.validationSubject.next(wf);
    this.persistedSnapshot = this.snapshot(wf);
    return wf;
  }

  getReports(workflowId: number, options?: { limit?: number; offset?: number }): Observable<WorkflowReport[]> {
    return this.api.getWorkflowReports(workflowId, options);
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

  patch(p: Partial<ValidationWorkflow>) {
    const cur = this.validationSubject.value;
    if (!cur) return;
    this.validationSubject.next({ ...cur, ...p });
  }

  hasUnsavedChanges(): boolean {
    return this.snapshot(this.validationSubject.value) !== this.persistedSnapshot;
  }

  save() {
    const cur = this.validationSubject.value;
    if (!cur) return of(null);
    if (cur.id) return this.api.update(cur).pipe(
      tap(updated => {
        this.validationSubject.next(updated);
        this.persistedSnapshot = this.snapshot(updated);
      })
    );
    return this.api.add(cur).pipe(
      tap(updated => {
        this.validationSubject.next(updated);
        this.persistedSnapshot = this.snapshot(updated);
      })
    );
  }

  private snapshot(value: ValidationWorkflow | null): string | null {
    return value ? JSON.stringify(value) : null;
  }
}
