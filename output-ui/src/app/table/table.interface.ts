import { Observable } from "rxjs";

export interface TableParent<T> {
  buttons: TableButton[];
  rowActions?: TableRowAction<T>[];
  preProcessing?: (() => Observable<void>),
  afterDataLoaded?: ((data: T[]) => Observable<void>),
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
  tooltip?: string | ((row: any) => string)
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
