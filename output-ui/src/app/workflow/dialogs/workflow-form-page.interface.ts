export interface WorkflowFormPage {
  hasPendingChanges(): boolean;
  persistFormToBackend(): Promise<boolean>;
  resetFormToFacade(): void;
}
