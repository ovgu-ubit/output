import { ApiErrorCode, ApiErrorDetail } from '../../../../../output-interfaces/ApiError';

export type UiErrorCode = ApiErrorCode | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';

export interface UiError {
  status: number;
  code: UiErrorCode;
  message: string;
  details: ApiErrorDetail[];
  correlationId?: string;
  path?: string;
  raw?: unknown;
}

export interface UiErrorCarrier {
  uiError?: UiError;
}

export interface UiErrorContext {
  action?: 'load' | 'save' | 'create' | 'update' | 'delete' | 'combine' | 'start' | 'run';
  entity?: string;
  entityPlural?: string;
  fallbackMessage?: string;
  bypassBackendUnavailableSuppression?: boolean;
}
