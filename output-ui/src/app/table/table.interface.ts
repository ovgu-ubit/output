import { Observable } from "rxjs";
import { IndexPage, IndexPageRequest } from '@output/interfaces';

export interface TableParent<T> {
  buttons: TableButton[];
  rowActions?: TableRowAction<T>[];
  preProcessing?: (() => Observable<void>),
  afterDataLoaded?: ((data: T[]) => Observable<void>),
  /** Notify the table when asynchronous actions change rows, buttons or configuration. */
  viewChanges$?: Observable<void>;
  loadPage?: ((request: IndexPageRequest<string>, reportingYear: number | null) => Observable<IndexPage<T>>),
  indexOptions?:any;
  not_editable?:boolean;
  not_selectable?:boolean;
}

export interface TableRowAction<T> {
  icon: string;
  tooltip: string | ((row: T) => string);
  action: (row: T) => void;
  visible?: (row: T) => boolean;
  disabled?: (row: T) => boolean;
}

export interface TableHeader {
  colName: string,
  colTitle: string,
  type?: string,
  roles?: string[],
  filterable?: boolean,
  tooltip?: string | ((row: any) => string)
}

/** Column filters and global search must use the same column selection. */
export function isTableColumnFilterable(col: TableHeader): boolean {
  return col.filterable !== false && !['pubs', 'invoices', 'euro', 'date', 'datetime', 'route-link'].includes(col.type);
}

export interface TableButton {
    title: string, 
    action_function: (() => void), 
    sub_buttons? : {
      title: string; 
      action_function: (() => void),
      roles? : string[]
      tooltip?: string;
    }[],
    roles? : string[]; 
    icon?: boolean;
    tooltip?: string;
}
