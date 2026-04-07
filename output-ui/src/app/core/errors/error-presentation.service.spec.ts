import { FormControl, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiErrorCode } from '../../../../../output-interfaces/ApiError';
import { ApiErrorParser } from './api-error-parser.service';
import { ErrorMessageService } from './error-message.service';
import { ErrorPresentationService } from './error-presentation.service';

describe('ErrorPresentationService', () => {
  const snackBar = {
    open: jasmine.createSpy('open'),
  } as unknown as MatSnackBar;

  const service = new ErrorPresentationService(snackBar, new ApiErrorParser(), new ErrorMessageService());

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
});
