import { PublicationType } from "../output-api/src/entity/PublicationType";
import { Funder, Institute, Publisher } from "./Publication";

export interface Alias<T> {
    element?: T,
    elementId: number,
    alias: string;
}

export interface AliasInstitute extends Alias<Institute> {
}
export interface AliasPublisher extends Alias<Publisher>{
}
export interface AliasPubType extends Alias<PublicationType>{
}
export interface AliasFunder extends Alias<Funder>{
}