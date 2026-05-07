import { CostCenter as ICostCenter } from '@output/interfaces';
import { Invoice } from "./Invoice.entity";
export declare class CostCenter implements ICostCenter {
    id?: number;
    number?: string;
    label?: string;
    invoices?: Invoice;
    locked_at?: Date;
}
