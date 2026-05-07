import { PublicationSupplement as IPublicationSupplement } from '@output/interfaces';
import { Publication } from "./Publication.entity";
export declare class PublicationSupplement implements IPublicationSupplement {
    id?: number;
    link: string;
    publication?: Publication;
}
