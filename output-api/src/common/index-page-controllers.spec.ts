import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { AccessGuard } from '../authorization/access.guard';
import { AuthorController } from '../author/AuthorController';
import { InstituteController } from '../institute/InstituteController';
import { ContractController } from '../contract/ContractController';
import { PublisherController } from '../publisher/PublisherController';
import { GreaterEntityController } from '../greater_entity/GreaterEntityController';
import { FunderController } from '../funder/FunderController';
import { PublicationTypeController } from '../pub_type/PublicationTypeController';
import { OACategoryController } from '../oa_category/OACategoryController';
import { InvoiceController } from '../invoice/InvoiceController';
import { RoleController } from '../publication/relations/RoleController';
import { StatusController } from '../publication/lookups/StatusController';

describe('Master-data index page endpoints', () => {
    const controllers = [
        { name: 'authors', make: service => new AuthorController(service), permission: 'cost' },
        { name: 'institutes', make: service => new InstituteController(service), permission: 'cost' },
        { name: 'contracts', make: service => new ContractController(service), permission: 'invoice' },
        { name: 'publishers', make: service => new PublisherController(service), permission: 'none' },
        { name: 'greater entities', make: service => new GreaterEntityController(service), permission: 'none' },
        { name: 'funders', make: service => new FunderController(service), permission: 'none' },
        { name: 'publication types', make: service => new PublicationTypeController(service), permission: 'cost' },
        { name: 'OA categories', make: service => new OACategoryController(service), permission: 'cost' },
        { name: 'roles', make: service => new RoleController(service), permission: 'none' },
        { name: 'statuses', make: service => new StatusController(service), permission: 'none' },
    ];
    const body = { page: 2, page_size: 20, reporting_year: 2026, sort: [], column_filters: { label: 'Test' } };
    const page = { items: [{ id: 3 }], total: 45, page: 2, page_size: 20 };

    it.each(controllers)('registers a guarded page endpoint for $name', entry => {
        const service = { indexPage: jest.fn().mockReturnValue(page) };
        const controller = entry.make(service as never);
        expect(Reflect.getMetadata(PATH_METADATA, controller.indexPage)).toBe('index-page');
        expect(Reflect.getMetadata(METHOD_METADATA, controller.indexPage)).toBe(RequestMethod.POST);
        expect(Reflect.getMetadata(GUARDS_METADATA, controller.indexPage)).toContain(AccessGuard);
        expect(controller.indexPage(body as never, { user: { read: true } } as never)).toBe(page);
        expect(service.indexPage).toHaveBeenCalledWith(body, ...(
            entry.permission === 'invoice' ? [true, true] : entry.permission === 'cost' ? [true] : []
        ));
    });

    it.each(controllers.filter(entry => entry.permission !== 'none'))('preserves anonymous access scope for $name', entry => {
        const service = { indexPage: jest.fn() };
        entry.make(service as never).indexPage(body as never, {} as never);
        expect(service.indexPage).toHaveBeenCalledWith(body, ...(entry.permission === 'invoice' ? [false, false] : [false]));
    });

    it.each(['costCenterIndexPage', 'costTypeIndexPage'] as const)('forwards invoice read permissions for %s', method => {
        const service = { indexPage: jest.fn().mockReturnValue(page) };
        const controller = new InvoiceController({} as never, service as never, service as never);
        expect(controller[method](body as never, { user: { read: true } } as never)).toBe(page);
        expect(service.indexPage).toHaveBeenLastCalledWith(body, true, true);
        controller[method](body as never, {} as never);
        expect(service.indexPage).toHaveBeenLastCalledWith(body, false, false);
        expect(Reflect.getMetadata(GUARDS_METADATA, controller[method])).toContain(AccessGuard);
    });
});
