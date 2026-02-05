import { Injectable } from "@angular/core";
import { BehaviorSubject, map, of, tap } from "rxjs";
import { ImportWorkflow } from "../../../../../../output-interfaces/Workflow";
import { WorkflowService } from "../../workflow.service";
import { ReportService } from "src/app/administration/services/report.service";

@Injectable({
  providedIn: 'root'
})
export class ImportFormFacade {
  private readonly importSubject = new BehaviorSubject<ImportWorkflow | null>(null);
  readonly import$ = this.importSubject.asObservable();
  reportFiles = [];

  constructor(private api: WorkflowService, private reportService:ReportService) {}

  load(id: number) {
    this.api.getOne(id).subscribe(wf => this.importSubject.next(wf));
  }

  getReports() {
    this.reportService.getReports('Import').pipe(map(data => {
      this.reportFiles = data.sort((a, b) => b.localeCompare(a));
    }))
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