import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, of, Subject, tap } from "rxjs";
import { ExportWorkflow, WorkflowReport } from "../../../../../../output-interfaces/Workflow";
import { ExportWorkflowService } from "../../export-workflow.service";

@Injectable()
export class ExportFormFacade {
  private readonly exportSubject = new BehaviorSubject<ExportWorkflow | null>(null);
  readonly export$ = this.exportSubject.asObservable();
  readonly destroy$ = new Subject<void>();

  constructor(private api: ExportWorkflowService) { }

  load(id: number) {
    return this.api.getOne(id).pipe(
      tap(wf => this.exportSubject.next(wf))
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

  save() {
    const cur = this.exportSubject.value;
    if (!cur) return of(null);
    if (cur.id) return this.api.update(cur).pipe(
      tap(updated => this.exportSubject.next(updated))
    );
    return this.api.add(cur).pipe(
      tap(updated => this.exportSubject.next(updated))
    );
  }
}
