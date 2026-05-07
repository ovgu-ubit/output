import { PublicationType as IPublicationType } from '@output/interfaces';
import { Publication } from "../publication/core/Publication.entity";
import { AliasPubType } from "./AliasPubType.entity";
export declare class PublicationType implements IPublicationType {
    id?: number;
    label: string;
    review: boolean;
    publications?: Publication[];
    aliases?: AliasPubType[];
    locked_at?: Date;
}
