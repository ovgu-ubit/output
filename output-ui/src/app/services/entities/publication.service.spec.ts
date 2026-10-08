import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CompareOperation, JoinOperation } from '@output/interfaces';
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
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(PublicationService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should load all reporting years through the filter endpoint', () => {
    service.index(2025, { allReportingYears: true }).subscribe();

    const request = httpTesting.expectOne('http://localhost/publications/filter');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      filter: { expressions: [] },
      paths: [],
    });
    request.flush([]);
  });

  it('should continue loading extended filters across all reporting years', () => {
    const filter = {
      expressions: [{
        op: JoinOperation.AND,
        key: 'title',
        comp: CompareOperation.INCLUDES,
        value: 'Angular',
      }],
    };

    service.index(2025, { filter }).subscribe();

    const request = httpTesting.expectOne('http://localhost/publications/filter');
    expect(request.request.method).toBe('POST');
    expect(request.request.body.filter).toEqual(filter);
    request.flush([]);
  });

  it('should use the reporting-year endpoint for the regular view', () => {
    service.index(2025).subscribe();

    const request = httpTesting.expectOne('http://localhost/publications/publicationIndex?yop=2025');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });
});
