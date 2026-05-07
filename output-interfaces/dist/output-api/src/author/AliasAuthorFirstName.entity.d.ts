import { AliasAuthorFirstName as IAliasAuthorFirstName } from '@output/interfaces';
import { Author } from "./Author.entity";
export declare class AliasAuthorFirstName implements IAliasAuthorFirstName {
    element?: Author;
    elementId?: number;
    alias: string;
}
