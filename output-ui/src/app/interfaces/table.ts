import { Observable } from "rxjs";

export interface TableParent<T> {
  buttons: TableButton[];
  preProcessing?: (() => Observable<void>),
  indexOptions?:any;
  not_editable?:boolean;
}

export interface TableHeader {
  colName: string,
  colTitle: string,
  type?: string
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

