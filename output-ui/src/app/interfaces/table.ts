import { SelectionModel } from "@angular/cdk/collections";

export interface TableParent<T> {
  update(): void;
  edit(row: any):void;

  buttons: TableButton[]

  loading: boolean;
  selection: SelectionModel<T>;
  showPubs?(id:number,field?:string);
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
    }[],
    roles? : string[]; 
}

