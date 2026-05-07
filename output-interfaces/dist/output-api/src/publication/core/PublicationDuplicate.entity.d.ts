import { PublicationDuplicate as IPublicationDuplicate } from '@output/interfaces';
import { Publication } from "./Publication.entity";
export declare class PublicationDuplicate implements IPublicationDuplicate {
    id?: number;
    id_first?: number;
    first?: Publication;
    id_second?: number;
    description?: string;
    delete_date?: Date;
}
