import { PublicationIdentifier as IPublicationIdentifier } from '@output/interfaces';
import { Publication } from "./Publication.entity";
export declare class PublicationIdentifier implements IPublicationIdentifier {
    id?: number;
    type: string;
    value: string;
    entity?: Publication;
}
