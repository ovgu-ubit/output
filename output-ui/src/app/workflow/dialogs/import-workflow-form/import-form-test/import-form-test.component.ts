import { Component, OnInit } from '@angular/core';
import { SharedModule } from 'src/app/shared/shared.module';
import {  ImportWorkflow, ImportWorkflowTestResult, ImportStrategy  } from '@output/interfaces';
import { ImportFormFacade } from '../import-form-facade.service';
import { WorkflowService } from 'src/app/workflow/workflow.service';
import { filter, finalize, takeUntil } from 'rxjs';
import { FormBuilder, FormGroup } from '@angular/forms';

type IssueDetail = {
  label: string;
  value: string;
};

type FormattedIssueError = {
  message: string | null;
  details: IssueDetail[];
  debug: string | null;
};

@Component({
  selector: 'app-import-form-test',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './import-form-test.component.html',
  styleUrl: './import-form-test.component.css',
})
export class ImportFormTestComponent implements OnInit {
  workflow: ImportWorkflow = null;
  isRunning = false;
  result: ImportWorkflowTestResult | null = null;
  errorMessage: string | null = null;
  form: FormGroup;

  constructor(
    private facade: ImportFormFacade,
    private workflowService: WorkflowService,
    private formBuilder: FormBuilder
  ) { }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      pos: ['']
    })
      this.facade.import$.pipe(filter((e): e is ImportWorkflow => e != null), takeUntil(this.facade.destroy$)).subscribe((workflow) => {
        this.workflow = workflow ?? null;
      });
  }

  runTest(): void {
    if (!this.workflow.id || this.isRunning) return;

    this.isRunning = true;
    this.result = null;
    this.errorMessage = null;
    const pos = this.form.controls.pos.value ?? 1;
    this.workflowService
      .test(this.workflow.id, pos)
      .pipe(finalize(() => (this.isRunning = false)))
      .subscribe({
        next: (res) => {
          this.result = res;
        },
        error: () => {
          this.errorMessage =
            'Der Testlauf konnte nicht gestartet werden. Bitte prüfen Sie die Workflow-Konfiguration.';
        },
      });
  }

  getErrorText(error: unknown) {
    return this.formatIssueError(error).message ?? '';
  }

  getErrorDetails(error: unknown): IssueDetail[] {
    return this.formatIssueError(error).details;
  }

  getErrorDebugText(error: unknown): string | null {
    return this.formatIssueError(error).debug;
  }

  get doiStrategy() {
    return this.workflow?.strategy_type === ImportStrategy.URL_DOI
  }

  private formatIssueError(error: unknown): FormattedIssueError {
    if (error === null || error === undefined) {
      return { message: null, details: [], debug: null };
    }

    if (typeof error === 'string') {
      return { message: error, details: [], debug: null };
    }

    if (typeof error !== 'object') {
      return { message: `${error}`, details: [], debug: null };
    }

    const record = error as Record<string, unknown>;
    const message = this.toText(record['message'])
      ?? this.toText(record['error'])
      ?? this.toText(record['name'])
      ?? 'Unbekannter Fehler';
    const jsonata = this.extractJsonataError(message);
    const details = [
      ...jsonata.details,
      ...this.extractApiDetails(record),
    ];

    return {
      message: jsonata.message ?? message,
      details,
      debug: this.toDebugText(record),
    };
  }

  private extractJsonataError(message: string): { message: string | null; details: IssueDetail[] } {
    const jsonStart = message.indexOf('{');
    if (jsonStart === -1) {
      return { message: null, details: [] };
    }

    try {
      const payload = JSON.parse(message.slice(jsonStart)) as Record<string, unknown>;
      const baseMessage = message.slice(0, jsonStart).replace(/:\s*$/, '').trim();
      const jsonataMessage = this.toText(payload['message'])
        ?? this.toText(payload['description'])
        ?? this.toText(payload['code']);
      const details: IssueDetail[] = [];

      this.addDetail(details, 'Code', payload['code']);
      this.addDetail(details, 'Position', payload['position']);
      this.addDetail(details, 'Index', payload['index']);
      this.addDetail(details, 'Token', payload['token']);
      this.addDetail(details, 'Wert', payload['value']);

      return {
        message: jsonataMessage ? `${baseMessage}: ${jsonataMessage}` : baseMessage,
        details,
      };
    } catch {
      return { message: null, details: [] };
    }
  }

  private extractApiDetails(record: Record<string, unknown>): IssueDetail[] {
    const details = record['details'];
    if (!Array.isArray(details)) return [];

    return details
      .map((detail) => {
        if (!detail || typeof detail !== 'object') return null;
        const detailRecord = detail as Record<string, unknown>;
        const path = this.toText(detailRecord['path']);
        const message = this.toText(detailRecord['message']);
        const code = this.toText(detailRecord['code']);
        if (!message && !code) return null;
        return {
          label: path ?? code ?? 'Detail',
          value: message ?? code,
        } as IssueDetail;
      })
      .filter((detail): detail is IssueDetail => !!detail);
  }

  private addDetail(details: IssueDetail[], label: string, value: unknown): void {
    const text = this.toText(value);
    if (text) details.push({ label, value: text });
  }

  private toDebugText(record: Record<string, unknown>): string | null {
    const cleaned = this.removeStack(record);
    const keys = Object.keys(cleaned);
    if (keys.length === 0 || (keys.length === 1 && keys[0] === 'message')) return null;
    return JSON.stringify(cleaned, null, 2);
  }

  private removeStack(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((entry) => this.removeStack(entry));
    if (!value || typeof value !== 'object') return value;

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => key !== 'stack')
        .map(([key, entry]) => [key, this.removeStack(entry)])
    );
  }

  private toText(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value.trim() ? value : null;
    if (typeof value === 'number' || typeof value === 'boolean') return `${value}`;
    return JSON.stringify(value);
  }
}
