import { PublisherDOI as IPublisherDOI } from '@output/interfaces';
import { Publisher } from "./Publisher.entity";
export declare class PublisherDOI implements IPublisherDOI {
    publisher?: Publisher;
    publisherId?: number;
    doi_prefix: string;
}
