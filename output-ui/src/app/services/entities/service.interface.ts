import { Observable } from "rxjs";

export interface EntityService<T, E> {
    getAll():Observable<T[]>;

    index(reporting_year: number, options?:any):Observable<E[]>;

    getOne(id:number):Observable<T>;
    
    add(obj:T):Observable<T>;

    update(obj:T):Observable<T>;

    delete(ids:number[],soft?:boolean):Observable<T[]>;
    
    combine?(id1: number, ids: number[], options?: any):any;
}

export interface EntityFormComponent<T> {
}

export interface PersistedEntityDialogResult<T> {
    persisted: true;
    mode: 'create' | 'update';
    entity: T;
}

export function isPersistedEntityDialogResult<T>(value: unknown): value is PersistedEntityDialogResult<T> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const candidate = value as Partial<PersistedEntityDialogResult<T>>;
    return candidate.persisted === true
        && (candidate.mode === 'create' || candidate.mode === 'update')
        && Object.prototype.hasOwnProperty.call(candidate, 'entity');
}
