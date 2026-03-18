import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { EntityService } from 'src/app/services/entities/service.interface';
import { SearchFilter } from '../../../../output-interfaces/Config';
import { ExportWorkflow, WorkflowReport } from '../../../../output-interfaces/Workflow';
import { WorkflowService } from './workflow.service';

@Injectable({
  providedIn: 'root'
})
export class ExportWorkflowService implements EntityService<ExportWorkflow, ExportWorkflow> {
  constructor(private api: WorkflowService) { }

  getAll(): Observable<ExportWorkflow[]> {
    return this.api.getAllExports();
  }

  index(_reporting_year: number, options?: { type: 'draft' | 'published' | 'archived' }): Observable<ExportWorkflow[]> {
    return this.api.getExports(options);
  }

  getOne(id: number): Observable<ExportWorkflow> {
    return this.api.getOneExport(id);
  }

  add(obj: ExportWorkflow): Observable<ExportWorkflow> {
    return this.api.addExport(obj);
  }

  update(obj: ExportWorkflow): Observable<ExportWorkflow> {
    return this.api.updateExport(obj);
  }

  delete(ids: number[]): Observable<ExportWorkflow[]> {
    return this.api.deleteExports(ids);
  }

  isLocked(id: number) {
    return this.api.isExportLocked(id);
  }

  export(id: number) {
    return this.api.exportWorkflow(id);
  }

  importWorkflow(file: File) {
    return this.api.importExportWorkflow(file);
  }

  run(id: number, filter?: { filter: SearchFilter, paths: string[] }, withMasterData = false) {
    return this.api.runExport(id, filter, withMasterData);
  }

  isRunning(id: number) {
    return this.api.isExportRunning(id);
  }

  getProgress(id: number) {
    return this.api.getExportProgress(id);
  }

  getStatus(id: number) {
    return this.api.getExportStatus(id);
  }

  getWorkflowReports(id: number): Observable<WorkflowReport[]> {
    return this.api.getExportWorkflowReports(id);
  }

  getWorkflowReport(reportId: number): Observable<WorkflowReport> {
    return this.api.getWorkflowReport(reportId);
  }

  deleteWorkflowReport(reportId: number) {
    return this.api.deleteWorkflowReport(reportId);
  }
}
