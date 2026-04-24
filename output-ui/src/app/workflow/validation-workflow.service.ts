import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { EntityService } from 'src/app/services/entities/service.interface';
import { ValidationWorkflow, WorkflowReport, WorkflowType } from '../../../../output-interfaces/Workflow';
import { WorkflowService } from './workflow.service';

@Injectable({
  providedIn: 'root'
})
export class ValidationWorkflowService implements EntityService<ValidationWorkflow, ValidationWorkflow> {
  constructor(private api: WorkflowService) { }

  getAll(): Observable<ValidationWorkflow[]> {
    return this.api.getAllValidations();
  }

  index(_reporting_year: number, options?: { type: 'draft' | 'published' | 'archived' }): Observable<ValidationWorkflow[]> {
    return this.api.getValidations(options);
  }

  getOne(id: number): Observable<ValidationWorkflow> {
    return this.api.getOneValidation(id);
  }

  add(obj: ValidationWorkflow): Observable<ValidationWorkflow> {
    return this.api.addValidation(obj);
  }

  update(obj: ValidationWorkflow): Observable<ValidationWorkflow> {
    return this.api.updateValidation(obj);
  }

  delete(ids: number[]): Observable<ValidationWorkflow[]> {
    return this.api.deleteValidations(ids);
  }

  isLocked(id: number) {
    return this.api.isValidationLocked(id);
  }

  unlock(id: number) {
    return this.api.unlockValidation(id);
  }

  run(id: number) {
    return this.api.runValidation(id);
  }

  isRunning(id: number) {
    return this.api.isValidationRunning(id);
  }

  getProgress(id: number) {
    return this.api.getValidationProgress(id);
  }

  getStatus(id: number) {
    return this.api.getValidationStatus(id);
  }

  getWorkflowReports(id: number, options?: { limit?: number; offset?: number }): Observable<WorkflowReport[]> {
    return this.api.getWorkflowReports(id, WorkflowType.VALIDATION, options);
  }

  getWorkflowReport(reportId: number): Observable<WorkflowReport> {
    return this.api.getWorkflowReport(reportId);
  }

  deleteWorkflowReport(reportId: number) {
    return this.api.deleteWorkflowReport(reportId);
  }
}
