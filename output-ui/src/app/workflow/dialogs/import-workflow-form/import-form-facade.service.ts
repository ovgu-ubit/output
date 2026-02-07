import { Injectable } from "@angular/core";
import { BehaviorSubject, concatWith, map, Observable, of, Subject, tap } from "rxjs";
import { ImportWorkflow } from "../../../../../../output-interfaces/Workflow";
import { WorkflowService } from "../../workflow.service";
import { ReportService } from "src/app/administration/services/report.service";

@Injectable({
  providedIn: 'root'
})
export class ImportFormFacade {
  private readonly importSubject = new BehaviorSubject<ImportWorkflow | null>(null);
  readonly import$ = this.importSubject.asObservable();
  readonly destroy$ = new Subject<void>();

  constructor(private api: WorkflowService, private reportService: ReportService) { }

  load(id: number) {
    this.api.getOne(id).subscribe(wf => this.importSubject.next(wf));
  }

  getReports(workflowName: string): Observable<string[]> {
    return this.reportService.getReports('workflow').pipe(map(data =>
      data
        .filter((report) => report.includes(workflowName))
        .sort((a, b) => b.localeCompare(a))
    ))
  }

  destroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  requestReport(filename: string) {
    return this.reportService.getReport('workflow', filename);
  }

  deleteReport(filename: string) {
    return this.reportService.deleteReport('workflow', filename);
  }

  patch(p: Partial<ImportWorkflow>) {
    const cur = this.importSubject.value;
    if (!cur) return;
    this.importSubject.next({ ...cur, ...p });
  }

  // optional: persist
  save() {
    const cur = this.importSubject.value;
    if (!cur) return of(null);
    return this.api.update(cur).pipe(
      tap(updated => this.importSubject.next(updated))
    );
  }
}