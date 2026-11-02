import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { PublicationDuplicateService } from './duplicate.service';

describe('Duplicate index pages', () => {
    it.each([false, true])('forwards the selected soft-delete view: %s', async soft => {
        const page = { items: [{ id: 7 }], total: 25, page: 2, page_size: 10 };
        const post = vi.fn().mockReturnValue(of(page));
        const service = new PublicationDuplicateService({ post } as unknown as HttpClient, { getValue: () => 'http://api/' } as never);
        const query = { page: 2, page_size: 10, column_filters: { description: 'test' } };
        expect(await firstValueFrom(service.indexPage(query, { soft }))).toEqual(page);
        expect(post).toHaveBeenCalledWith('http://api/publications/duplicates/index-page', { ...query, soft }, { withCredentials: true });
    });
});
