import { GEIdentifier as IIdentifier } from '@output/interfaces';
import { GreaterEntity } from "./GreaterEntity.entity";
export declare class GEIdentifier implements IIdentifier {
    id?: number;
    type: string;
    value: string;
    entity?: GreaterEntity;
}
