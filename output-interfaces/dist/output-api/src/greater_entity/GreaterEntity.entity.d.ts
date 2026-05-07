import { GreaterEntity as IGreaterEntity } from '@output/interfaces';
import { Publication } from "../publication/core/Publication.entity";
import { GEIdentifier } from "./GEIdentifier.entity";
export declare class GreaterEntity implements IGreaterEntity {
    id?: number;
    label: string;
    rating?: string;
    doaj_since?: Date;
    doaj_until?: Date;
    identifiers?: GEIdentifier[];
    publications?: Publication[];
    locked_at?: Date;
}
