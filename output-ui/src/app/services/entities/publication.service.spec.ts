import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RuntimeConfigService } from '../runtime-config.service';
import { PublicationService } from './publication.service';

describe('PublicationService', () => {
  let service: PublicationService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PublicationService,
        { provide: RuntimeConfigService, useValue: { getValue: () => 'http://localhost/' } },
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(PublicationService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should load a publication page from the paginated endpoint', () => {
    const body = {
      page: 2,
      page_size: 20,
      reporting_year: 2025,
      sort: [{ key: 'title' as const, direction: 'asc' as const }],
      q: 'Angular',
    };

    service.indexPage(body).subscribe(page => {
      expect(page).toEqual({ items: [], total: 41, page: 2, page_size: 20 });
    });

    const request = httpTesting.expectOne('http://localhost/publications/index-page');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    expect(request.request.withCredentials).toBe(true);
    request.flush({ items: [], total: 41, page: 2, page_size: 20 });
  });
});
