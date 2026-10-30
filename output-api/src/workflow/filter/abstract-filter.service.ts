import { Injectable } from "@nestjs/common";

export function FilterService(meta: {path: string}): ClassDecorator {
  return (target) => Reflect.defineMetadata("filter_service", meta, target);
}
export function getFilterServiceMeta(target: Function): {path: string} | undefined {
  return Reflect.getMetadata("filter_service", target);
}

@Injectable()
/**
 * abstract class for all filter functions
 */
export abstract class AbstractFilterService<T> {

    abstract filter(pubs:T[], options?:any):Promise<T[]>;

    abstract getName(): string;
}

/** Optional database representation used when a filter must run before pagination. */
export interface SqlFilterService {
    getSqlPredicate(entityAlias: string): string;
}

export function supportsSqlFiltering(service: unknown): service is SqlFilterService {
    return typeof (service as Partial<SqlFilterService>)?.getSqlPredicate === 'function';
}
