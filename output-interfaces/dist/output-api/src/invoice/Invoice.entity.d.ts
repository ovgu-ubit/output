import { CostCenter } from "./CostCenter.entity";
import { CostItem } from "./CostItem.entity";
import { Invoice as IInvoice, InvoiceKind } from '@output/interfaces';
import { Publication } from "../publication/core/Publication.entity";
import { ContractComponent } from "../contract/ContractComponent.entity";
export declare class Invoice implements IInvoice {
    id?: number;
    cost_center?: CostCenter;
    cost_items?: CostItem[];
    publication?: Publication;
    contract_component?: ContractComponent;
    invoice_kind?: InvoiceKind;
    number?: string;
    date?: Date;
    booking_date?: Date;
    booking_amount?: number;
}
