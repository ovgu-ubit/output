import { AliasPubType as IAliasPubType } from '@output/interfaces';
import { PublicationType } from "./PublicationType.entity";
export declare class AliasPubType implements IAliasPubType {
    element?: PublicationType;
    elementId?: number;
    alias: string;
}
