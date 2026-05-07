import { AliasAuthorLastName as IAliasAuthorLastName } from '@output/interfaces';
import { Author } from "./Author.entity";
export declare class AliasAuthorLastName implements IAliasAuthorLastName {
    element?: Author;
    elementId?: number;
    alias: string;
}
