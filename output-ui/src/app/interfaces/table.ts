import { SelectionModel } from "@angular/cdk/collections";

export interface TableParent<T> {

  buttons: TableButton[]
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

