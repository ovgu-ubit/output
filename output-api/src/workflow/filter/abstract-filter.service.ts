import { Injectable } from "@nestjs/common";

@Injectable()
/**
 * abstract class for all filter functions
 */
export abstract class AbstractFilterService<T> {

    abstract filter(pubs:T[], options?:any):Promise<T[]>;

    abstract getName(): string;
}