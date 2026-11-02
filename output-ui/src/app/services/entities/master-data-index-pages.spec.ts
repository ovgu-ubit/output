import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RuntimeConfigService } from '../runtime-config.service';
import { AuthorService } from './author.service';
import { InstituteService } from './institute.service';
import { ContractService } from './contract.service';
import { PublisherService } from './publisher.service';
import { GreaterEntityService } from './greater-entity.service';
import { FunderService } from './funder.service';
import { PublicationTypeService } from './publication-type.service';
import { OACategoryService } from './oa-category.service';
import { CostCenterService } from './cost-center.service';
import { CostTypeService } from './cost-type.service';
import { RoleService } from './role.service';
import { StatusService } from './status.service';

describe('Master-data page requests', () => {
    const endpoints = [
        { service: AuthorService, path: 'authors' }, { service: InstituteService, path: 'institute' },
        { service: ContractService, path: 'contract' }, { service: PublisherService, path: 'publisher' },
        { service: GreaterEntityService, path: 'greater_entity' }, { service: FunderService, path: 'funder' },
        { service: PublicationTypeService, path: 'pub_type' }, { service: OACategoryService, path: 'oa_cat' },
        { service: CostCenterService, path: 'invoice/cost_center' }, { service: CostTypeService, path: 'invoice/cost_type' },
        { service: RoleService, path: 'role' }, { service: StatusService, path: 'status' },
    ];
    let http: HttpTestingController;
    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [
            provideHttpClient(withXhr()), provideHttpClientTesting(),
            { provide: RuntimeConfigService, useValue: { getValue: () => 'http://localhost/' } },
        ] });
        http = TestBed.inject(HttpTestingController);
    });
    afterEach(() => http.verify());

    for (const endpoint of endpoints) it(`loads ${endpoint.path} via its server-side page endpoint`, () => {
        const service = TestBed.inject(endpoint.service as typeof AuthorService);
        const body = { page: 1, page_size: 20, reporting_year: null, q: 'test', sort: [{ key: 'id', direction: 'desc' as const }] };
        const response = { items: [], total: 25, page: 1, page_size: 20 };
        service.indexPage(body).subscribe(result => expect(result).toEqual(response));
        const request = http.expectOne(`http://localhost/${endpoint.path}/index-page`);
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual(body);
        expect(request.request.withCredentials).toBe(true);
        request.flush(response);
    });
});
