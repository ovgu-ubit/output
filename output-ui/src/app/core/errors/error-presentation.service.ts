import { Injectable } from '@angular/core';
import { AbstractControl, FormArray, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription, take } from 'rxjs';
import { ApiErrorCode, ApiErrorDetail } from '../../../../../output-interfaces/ApiError';
import { ApiErrorParser } from './api-error-parser.service';
import { BackendAvailabilityService } from './backend-availability.service';
import { ErrorMessageService } from './error-message.service';
import { UiError, UiErrorContext } from './ui-error';

@Injectable({
  providedIn: 'root'
})
export class ErrorPresentationService {
  private readonly resetSubscriptions = new WeakMap<AbstractControl, Subscription>();

  constructor(
    private snackBar: MatSnackBar,
    private parser: ApiErrorParser,
    private messages: ErrorMessageService,
    private backendAvailability: BackendAvailabilityService,
  ) { }

  present(error: unknown, context: UiErrorContext = {}): UiError {
    const parsed = this.parser.parse(error);
    if (this.backendAvailability.isUnavailable() && !context.bypassBackendUnavailableSuppression) {
      return parsed;
    }
    const baseMessage = this.messages.getMessage(parsed, context);
    const detailSummary = parsed.code === ApiErrorCode.VALIDATION_FAILED
      ? this.messages.getDetailSummary(parsed, 2)
      : [];
    const message = detailSummary.length > 0
      ? `${baseMessage} ${detailSummary.join(' | ')}`
      : baseMessage;

    this.snackBar.open(message, 'Schliessen', {
      duration: parsed.code === ApiErrorCode.VALIDATION_FAILED ? 7000 : 5000,
      verticalPosition: 'top',
      panelClass: [this.getPanelClass(parsed)],
    });

    return parsed;
  }

  applyFieldErrors(
    form: AbstractControl,
    error: unknown,
    options: {
      pathPrefixes?: string[];
      pathMap?: Record<string, string>;
    } = {},
  ): UiError {
    const parsed = this.parser.parse(error);
    this.clearFieldErrors(form);

    const unmatched: ApiErrorDetail[] = [];
    for (const detail of parsed.details) {
      const control = this.resolveControl(form, detail.path, options.pathPrefixes ?? [], options.pathMap ?? {});
      if (!control) {
        unmatched.push(detail);
        continue;
      }

      const currentErrors = control.errors ?? {};
      control.setErrors({
        ...currentErrors,
        api: true,
        apiMessage: detail.message,
      });
      control.markAsTouched();
      this.scheduleApiErrorReset(control);
    }

    if (unmatched.length > 0) {
      const currentErrors = form.errors ?? {};
      form.setErrors({
        ...currentErrors,
        apiSummary: unmatched.map((detail) => detail.message),
      });
    }

    form.markAllAsTouched();
    return parsed;
  }

  clearFieldErrors(control: AbstractControl): void {
    this.clearControlApiErrors(control);

    if (control instanceof FormGroup) {
      Object.values(control.controls).forEach((child) => this.clearFieldErrors(child));
      return;
    }

    if (control instanceof FormArray) {
      control.controls.forEach((child) => this.clearFieldErrors(child));
    }
  }

  private resolveControl(
    form: AbstractControl,
    path: string | undefined,
    pathPrefixes: string[],
    pathMap: Record<string, string>,
  ): AbstractControl | null {
    if (!path) return null;

    const candidates = new Set<string>([path]);
    for (const [source, target] of Object.entries(pathMap)) {
      if (path === source || path.startsWith(source)) {
        candidates.add(target);
      }
    }
    for (const prefix of pathPrefixes) {
      if (path.startsWith(prefix)) {
        candidates.add(path.slice(prefix.length));
      }
    }

    const segments = path.split('.');
    for (let index = 1; index < segments.length; index++) {
      candidates.add(segments.slice(index).join('.'));
    }

    for (const candidate of candidates) {
      const resolved = form.get(candidate);
      if (resolved) return resolved;
    }

    return null;
  }

  private clearControlApiErrors(control: AbstractControl): void {
    const existingSubscription = this.resetSubscriptions.get(control);
    if (existingSubscription) {
      existingSubscription.unsubscribe();
      this.resetSubscriptions.delete(control);
    }

    const currentErrors = control.errors;
    if (!currentErrors) return;

    const { api, apiMessage, apiSummary, ...remainingErrors } = currentErrors;
    void api;
    void apiMessage;
    void apiSummary;

    control.setErrors(Object.keys(remainingErrors).length > 0 ? remainingErrors : null);
  }

  private scheduleApiErrorReset(control: AbstractControl): void {
    const existingSubscription = this.resetSubscriptions.get(control);
    if (existingSubscription) {
      existingSubscription.unsubscribe();
    }

    const subscription = control.valueChanges.pipe(take(1)).subscribe(() => {
      this.clearControlApiErrors(control);
    });
    this.resetSubscriptions.set(control, subscription);
  }

  private getPanelClass(error: UiError): string {
    switch (error.code) {
      case ApiErrorCode.VALIDATION_FAILED:
      case ApiErrorCode.INVALID_REQUEST:
        return 'warning-snackbar';
      case ApiErrorCode.FORBIDDEN:
      case ApiErrorCode.UNAUTHENTICATED:
      case ApiErrorCode.ENTITY_LOCKED:
      case ApiErrorCode.UNIQUE_CONSTRAINT:
      case ApiErrorCode.WORKFLOW_RUNNING:
      case ApiErrorCode.NOT_FOUND:
      case ApiErrorCode.INTERNAL_ERROR:
      case 'NETWORK_ERROR':
      case 'UNKNOWN_ERROR':
      default:
        return 'danger-snackbar';
    }
  }
}
