import { Publisher as IPublisher } from '@output/interfaces';
import { PublisherDOI } from "./PublisherDOI.entity";
import { Publication } from "../publication/core/Publication.entity";
import { AliasPublisher } from "./AliasPublisher.entity";
export declare class Publisher implements IPublisher {
    id?: number;
    label: string;
    doi_prefixes?: PublisherDOI[];
    publications?: Publication[];
    aliases?: AliasPublisher[];
    locked_at?: Date;
}
