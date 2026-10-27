import { ImportRunStatus } from '@output/interfaces';

// Export/validation status responses and older servers do not expose cancellation fields.
export type ImportProgress = Omit<ImportRunStatus, 'stopRequested'> & { stopRequested?: boolean };

export function isImportStopping(status: ImportProgress): boolean {
  return status.stopRequested === true || status.status === 'stopping';
}
