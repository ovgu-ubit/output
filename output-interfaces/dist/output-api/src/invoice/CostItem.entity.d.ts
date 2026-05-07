import { CostType } from "./CostType.entity";
import { Invoice } from "./Invoice.entity";
import { CostItem as ICostItem } from '@output/interfaces';
export declare class CostItem implements ICostItem {
    id?: number;
    label?: string;
    invoice?: Invoice;
    cost_type?: CostType;
    euro_value?: number;
    orig_value?: number;
    orig_currency?: string;
    normal_price?: number;
    vat?: number;
}
