import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { RuntimeConfigService } from '../../services/runtime-config.service';
import { SharedModule } from '../../shared/shared.module';
import { DemoLoginDialogComponent } from './demo-login-dialog.component';

describe('DemoLoginDialogComponent', () => {
  let fixture: ComponentFixture<DemoLoginDialogComponent>;
  let component: DemoLoginDialogComponent;
  let httpMock: HttpTestingController;
  let dialogRef: jasmine.SpyObj<MatDialogRef<DemoLoginDialogComponent>>;
  let runtimeConfigService: jasmine.SpyObj<RuntimeConfigService>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<DemoLoginDialogComponent>>('MatDialogRef', ['close']);
    runtimeConfigService = jasmine.createSpyObj<RuntimeConfigService>('RuntimeConfigService', ['getValue']);
    runtimeConfigService.getValue.and.callFake(<T>(key: string): T => {
      if (key === 'auth_api') return '' as T;
      if (key === 'api') return 'api/' as T;
      return null as T;
    });

    await TestBed.configureTestingModule({
      declarations: [DemoLoginDialogComponent],
      imports: [SharedModule, NoopAnimationsModule, RouterModule.forRoot([])],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { redirectUrl: '/publications' } },
        { provide: RuntimeConfigService, useValue: runtimeConfigService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DemoLoginDialogComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('posts credentials to the demo login endpoint', () => {
    component.form.setValue({ username: 'demo', password: 'secret' });

    component.login();

    const request = httpMock.expectOne('api/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toEqual({ username: 'demo', password: 'secret' });

    request.flush({ id: 'demo', permissions: [{ appname: 'output', rolename: 'admin' }] });

    expect(dialogRef.close).toHaveBeenCalledWith({ success: true, redirectUrl: '/publications' });
  });

  it('shows a neutral login error on unauthorized responses', () => {
    component.form.setValue({ username: 'demo', password: 'wrong' });

    component.login();

    const request = httpMock.expectOne('api/auth/login');
    request.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(component.errorMessage).toBe('Anmeldung fehlgeschlagen.');
    expect(component.isSubmitting).toBe(false);
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('closes the dialog before navigating to demo info', () => {
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a[routerLink="/demo-info"]');

    link.click();

    expect(dialogRef.close).toHaveBeenCalledWith({ success: false });
  });
});
