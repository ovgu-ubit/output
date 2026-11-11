import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { RuntimeConfigService } from 'src/app/services/runtime-config.service';
import { ImportService } from './import.service';
import { EnrichService } from './enrich.service';

describe('Legacy stop API', () => {
    it('posts authenticated cancellation requests for imports, file imports and enrichment', async () => {
        const http = {
            post: vi.fn().mockName("HttpClient.post")
        };
        http.post.mockReturnValue(of({ state: 'stopping', runId: 'run-1' }));
        const config = { getValue: () => 'http://api/' } as unknown as RuntimeConfigService;
        const imports = new ImportService(http as unknown as HttpClient, config);
        const enrichs = new EnrichService(http as unknown as HttpClient, config);
        for (const path of ['crossref', 'csv', 'xls']) {
            await firstValueFrom(imports.stop(path));
            expect(http.post).toHaveBeenCalledWith(`http://api/import/${path}/stop`, {}, { withCredentials: true });
        }
        expect(await firstValueFrom(enrichs.stop('unpaywall'))).toEqual({ state: 'stopping', runId: 'run-1' });
        expect(http.post).toHaveBeenCalledWith('http://api/enrich/unpaywall/stop', {}, { withCredentials: true });
    });
});
