import { HttpErrorResponse, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ApiErrorParser } from './api-error-parser.service';

@Injectable()
export class ApiErrorInterceptor implements HttpInterceptor {
  constructor(private parser: ApiErrorParser) { }

  intercept(req: HttpRequest<unknown>, next: HttpHandler) {
    return next.handle(req).pipe(
      catchError((error: unknown) => {
        const uiError = this.parser.parse(error);

        if (error instanceof HttpErrorResponse) {
          Object.assign(error, { uiError });
          return throwError(() => error);
        }

        return throwError(() => ({
          ...(typeof error === 'object' && error ? error : {}),
          uiError,
        }));
      }),
    );
  }
}
