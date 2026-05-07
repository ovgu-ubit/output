import { CostType as ICostType } from '@output/interfaces';
export declare class CostType implements ICostType {
    id?: number;
    label: string;
    locked_at?: Date;
}
