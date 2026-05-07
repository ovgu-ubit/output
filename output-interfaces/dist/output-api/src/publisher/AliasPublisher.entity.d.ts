import { AliasPublisher as IAliasPublisher } from '@output/interfaces';
import { Publisher } from "./Publisher.entity";
declare const AliasPublisherBase: abstract new () => {
    element?: Publisher;
    elementId?: number;
    alias: string;
};
export declare class AliasPublisher extends AliasPublisherBase implements IAliasPublisher {
}
export {};
