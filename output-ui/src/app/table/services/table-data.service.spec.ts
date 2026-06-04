import { of } from 'rxjs';
import { TableDataService } from './table-data.service';

describe('TableDataService', () => {
  let service: TableDataService<any, any>;

  beforeEach(() => {
    service = new TableDataService<any, any>();
    service.init(
      { index: jasmine.createSpy('index').and.returnValue(of([])) } as any,
      { buttons: [] } as any,
      [{ colName: 'id', colTitle: 'ID', type: 'number' }]
    );
  });

  it('uses changed headers when sorting data', () => {
    service.update([
      { id: 1, status: 10 },
      { id: 2, status: 2 },
    ]);

    service.setHeaders([
      { colName: 'id', colTitle: 'ID', type: 'number' },
      { colName: 'status', colTitle: 'Status', type: 'number' },
    ]);
    service.announceSortChange({ active: 'status', direction: 'asc' });

    expect(service.dataSource.data.map(row => row.status)).toEqual([2, 10]);
  });
});
