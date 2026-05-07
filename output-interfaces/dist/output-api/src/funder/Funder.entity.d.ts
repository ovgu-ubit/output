import { Funder as IFunder } from '@output/interfaces';
import { Publication } from "../publication/core/Publication.entity";
import { AliasFunder } from "./AliasFunder.entity";
export declare class Funder implements IFunder {
    id?: number;
    label: string;
    doi?: string;
    ror_id?: string;
    third_party?: boolean;
    publications?: Publication[];
    aliases?: AliasFunder[];
    locked_at?: Date;
}
