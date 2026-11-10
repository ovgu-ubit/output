import { CompareOperation, JoinOperation } from '@output/interfaces';
import { ExcelExportService } from './excel-export.service';
import { JulichExportService } from './julich-export.service';
import { MasterExportService } from './master-export.service';
import { OpenAPCExportService } from './openapc-export.service';
import { PublicationIndexService } from '../../publication/core/publication-index.service';

describe('Tag filters in built-in internal exports', () => {
    it.each(['excel', 'juelich', 'master', 'openapc'])('passes a trusted filter context for %s', async format => {
        const getAll = jest.fn().mockResolvedValue([]);
        const index = { getAll } as unknown as PublicationIndexService;
        const reports = { createReport: jest.fn().mockResolvedValue('report'), finish: jest.fn() } as never;
        const config = { get: jest.fn().mockResolvedValue([]) } as never;
        const invoices = { getCostTypes: jest.fn().mockResolvedValue([]) } as never;
        const unused = {} as never;
        const exporters = {
            excel: new ExcelExportService(index, reports, config, invoices, unused, unused, unused, unused, unused, unused, unused, unused),
            juelich: new JulichExportService(index, reports, config),
            master: new MasterExportService(index, reports, config, invoices),
            openapc: new OpenAPCExportService(index, reports, config, unused),
        };
        const filter = { expressions: [{ op: JoinOperation.AND, key: 'tag_id', comp: CompareOperation.EQUALS, value: 7 }] };
        await exporters[format].export({ filter, paths: [] });
        expect(getAll).toHaveBeenCalledWith(filter, { canReadTags: true });
    });
});
