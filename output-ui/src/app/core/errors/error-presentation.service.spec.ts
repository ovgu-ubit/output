import { FormControl, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiErrorCode } from '../../../../../output-interfaces/ApiError';
import { ApiErrorParser } from './api-error-parser.service';
import { BackendAvailabilityService } from './backend-availability.service';
import { ErrorMessageService } from './error-message.service';
import { ErrorPresentationService } from './error-presentation.service';

describe('ErrorPresentationService', () => {
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let backendAvailability: BackendAvailabilityService;
  let service: ErrorPresentationService;

  beforeEach(() => {
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    backendAvailability = new BackendAvailabilityService();
    service = new ErrorPresentationService(
      snackBar,
      new ApiErrorParser(),
      new ErrorMessageService(),
      backendAvailability,
    );
  });

  it('maps backend detail paths onto flat form controls using prefixes', () => {
    const form = new FormGroup({
      delimiter: new FormControl(''),
    });

    service.applyFieldErrors(form, {
      status: 400,
      code: ApiErrorCode.VALIDATION_FAILED,
      message: 'Validation failed',
      details: [
        { path: 'strategy.delimiter', code: 'required', message: 'delimiter is required' },
      ],
    }, {
      pathPrefixes: ['strategy.'],
    });

    expect(form.get('delimiter')?.errors).toEqual(jasmine.objectContaining({
      api: true,
      apiMessage: 'delimiter is required',
    }));
  });

  it('suppresses follow-up snackbars while backend is marked unavailable', () => {
    backendAvailability.markUnavailable();

    service.present({
      status: 500,
      code: ApiErrorCode.INTERNAL_ERROR,
      message: 'Unexpected error',
      details: [],
    });

    expect(snackBar.open).not.toHaveBeenCalled();
  });

  it('still allows the heartbeat outage message to be shown explicitly', () => {
    backendAvailability.markUnavailable();

    service.present({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Backend not reachable',
      details: [],
    }, {
      fallbackMessage: 'Backend nicht erreichbar oder nicht betriebsbereit.',
      bypassBackendUnavailableSuppression: true,
    });

    expect(snackBar.open).toHaveBeenCalledWith(
      'Backend nicht erreichbar oder nicht betriebsbereit.',
      'Schliessen',
      jasmine.any(Object),
    );
  });
});
