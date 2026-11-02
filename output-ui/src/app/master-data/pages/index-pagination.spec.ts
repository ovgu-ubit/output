import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Store } from '@ngrx/store';
import { of, Subject } from 'rxjs';
import { ConfigService } from '../../administration/services/config.service';
import { ErrorPresentationService } from '../../core/errors/error-presentation.service';
import { AuthorizationService } from '../../security/authorization.service';
import { AuthorService } from '../../services/entities/author.service';
import { SharedModule } from '../../shared/shared.module';
import { TableModule } from '../../table/table.module';
import { TableComponent } from '../../table/table-component/table.component';
import { AuthorsComponent } from './authors/authors.component';

describe('Rendered index pagination', () => {
    it('displays the returned page without slicing it again and synchronizes both paginators', async () => {
        const initialResponse = new Subject<unknown>();
        const nextResponse = new Subject<unknown>();
        const indexPage = vi.fn().mockReturnValueOnce(initialResponse).mockReturnValueOnce(nextResponse);
        const errors = { present: vi.fn() };
        await TestBed.configureTestingModule({
            imports: [SharedModule, TableModule, NoopAnimationsModule],
            declarations: [AuthorsComponent],
            providers: [
                provideRouter([]),
                { provide: Store, useValue: { select: () => of(2026), dispatch: vi.fn() } },
                { provide: ConfigService, useValue: { get: () => of({ value: 2026 }) } },
                { provide: AuthorService, useValue: { indexPage } },
                { provide: AuthorizationService, useValue: { hasRole: () => true } },
                { provide: ErrorPresentationService, useValue: errors },
            ],
        }).compileComponents();
        const fixture = TestBed.createComponent(AuthorsComponent);
        fixture.detectChanges();
        initialResponse.next({ items: [{ id: 1, first_name: 'Ada', last_name: 'Lovelace' }], total: 25, page: 0, page_size: 10 });
        initialResponse.complete();
        await fixture.whenStable();
        fixture.detectChanges();
        const table = fixture.debugElement.query(By.directive(TableComponent)).componentInstance as TableComponent<any, any>;
        expect(table.paginator.length).toBe(25);
        expect(fixture.nativeElement.querySelector('td.mat-column-id').textContent.trim()).toBe('1');

        table.handlePage({ pageIndex: 2, pageSize: 10, length: 25 });
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('td.mat-column-id').textContent.trim()).toBe('1');
        expect(fixture.nativeElement.querySelector('.table-loading-overlay')).not.toBeNull();
        nextResponse.next({ items: [{ id: 21, first_name: 'Ada', last_name: 'Lovelace' }], total: 25, page: 2, page_size: 10 });
        nextResponse.complete();
        await fixture.whenStable();
        fixture.detectChanges();
        expect(indexPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, page_size: 10 }), undefined);
        expect(fixture.nativeElement.querySelector('td.mat-column-id').textContent.trim()).toBe('21');
        expect(table.paginator.pageIndex).toBe(2);
        expect(table.paginator2.pageIndex).toBe(2);
        expect(table.rowCount).toBe(25);
        expect(fixture.nativeElement.querySelector('.table-loading-overlay')).toBeNull();
        expect(errors.present).not.toHaveBeenCalled();
        fixture.destroy();
    });
});
