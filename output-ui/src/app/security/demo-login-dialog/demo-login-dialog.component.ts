import { HttpClient } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { RuntimeConfigService } from '../../services/runtime-config.service';

export interface DemoLoginDialogData {
  redirectUrl?: string;
}

export interface DemoLoginDialogResult {
  success: boolean;
  redirectUrl?: string;
}

@Component({
  selector: 'app-demo-login-dialog',
  templateUrl: './demo-login-dialog.component.html',
  styleUrls: ['./demo-login-dialog.component.css'],
  standalone: false
})
export class DemoLoginDialogComponent {
  errorMessage = '';
  isSubmitting = false;
  form = this.formBuilder.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  constructor(
    private formBuilder: FormBuilder,
    private http: HttpClient,
    private runtimeConfigService: RuntimeConfigService,
    private dialogRef: MatDialogRef<DemoLoginDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DemoLoginDialogData,
  ) {}

  login() {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.http.post(this.getAuthBaseUrl() + 'auth/login', this.form.getRawValue(), { withCredentials: true }).subscribe({
      next: () => this.dialogRef.close({ success: true, redirectUrl: this.data?.redirectUrl }),
      error: () => {
        this.errorMessage = 'Anmeldung fehlgeschlagen.';
        this.isSubmitting = false;
      }
    });
  }

  cancel() {
    this.dialogRef.close({ success: false });
  }

  private getAuthBaseUrl(): string {
    return this.runtimeConfigService.getValue<string>('auth_api') || this.runtimeConfigService.getValue<string>('api');
  }
}
