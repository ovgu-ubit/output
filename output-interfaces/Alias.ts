import { PublicationType } from "../output-api/src/pub_type/PublicationType";
import { Author, Entity, Funder, Institute, Publisher } from "./Publication";

export interface Alias<T> {
    element?: T,
    elementId?: number,
    alias: string;
}

export interface Aliasable<T> extends Entity {
    aliases?: Alias<T>[];
}

export interface AliasInstitute extends Alias<Institute> {
}
export interface AliasPublisher extends Alias<Publisher>{
}
export interface AliasPubType extends Alias<PublicationType>{
}
export interface AliasFunder extends Alias<Funder>{
}
export interface AliasAuthorFirstName extends Alias<Author>{
}
export interface AliasAuthorLastName extends Alias<Author>{
}