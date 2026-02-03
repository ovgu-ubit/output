import { Injectable } from "@angular/core";
import { BehaviorSubject, of, tap } from "rxjs";
import { ImportWorkflow } from "../../../../../../output-interfaces/Workflow";
import { WorkflowService } from "../../workflow.service";

@Injectable({
  providedIn: 'root'
})
export class ImportFormFacade {
  private readonly importSubject = new BehaviorSubject<ImportWorkflow | null>(null);
  readonly import$ = this.importSubject.asObservable();

  constructor(private api: WorkflowService) {}

  load(id: number) {
    this.api.getOne(id).subscribe(wf => this.importSubject.next(wf));
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